from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Shop, Product, InventoryTransaction
from app.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.dependencies import get_current_shop

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.shop_id == current_shop.id)

    if search:
        s = f"%{search}%"
        query = query.filter((Product.name.ilike(s)) | (Product.sku.ilike(s)))
    
    if category:
        query = query.filter(Product.category == category)
        
    if low_stock_only:
        query = query.filter(Product.stock_quantity <= Product.low_stock_threshold)

    return query.order_by(Product.name.asc()).all()


def get_next_quick_code(db: Session, shop_id: int) -> str:
    products = db.query(Product.quick_code).filter(
        Product.shop_id == shop_id,
        Product.is_active == True,
        Product.quick_code.isnot(None)
    ).all()
    
    existing_nums = set()
    for (qc,) in products:
        if qc and qc.strip().isdigit():
            existing_nums.add(int(qc.strip()))
            
    next_num = 1
    while next_num in existing_nums:
        next_num += 1
        
    return str(next_num)


@router.get("/next-quick-code")
def get_next_quick_code_endpoint(
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    return {"next_quick_code": get_next_quick_code(db, current_shop.id)}


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    # Check duplicate SKU for active products in this shop
    existing_sku = db.query(Product).filter(
        Product.shop_id == current_shop.id,
        Product.sku == payload.sku.strip().upper(),
        Product.is_active == True
    ).first()
    
    if existing_sku:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{payload.sku}' already exists in your shop."
        )

    # Check duplicate Quick Code for this shop
    if payload.quick_code and payload.quick_code.strip():
        qc = payload.quick_code.strip()
        existing_qc = db.query(Product).filter(
            Product.shop_id == current_shop.id,
            Product.quick_code == qc,
            Product.is_active == True
        ).first()
        if existing_qc:
            suggested_code = get_next_quick_code(db, current_shop.id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quick Code '{qc}' is already assigned to product '{existing_qc.name}'. Next available Quick Code is {suggested_code}."
            )

    product = Product(
        shop_id=current_shop.id,
        name=payload.name.strip(),
        sku=payload.sku.strip().upper(),
        quick_code=payload.quick_code.strip() if payload.quick_code and payload.quick_code.strip() else None,
        category=payload.category.strip() if payload.category else "General",
        purchase_price=payload.purchase_price,
        selling_price=payload.selling_price,
        gst_percentage=payload.gst_percentage,
        stock_quantity=payload.stock_quantity,
        low_stock_threshold=payload.low_stock_threshold,
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Initial inventory log if stock_quantity > 0
    if product.stock_quantity > 0:
        inv_log = InventoryTransaction(
            shop_id=current_shop.id,
            product_id=product.id,
            transaction_type="STOCK_IN",
            quantity=product.stock_quantity,
            previous_stock=0,
            new_stock=product.stock_quantity,
            reason="Initial Stock Onboarding"
        )
        db.add(inv_log)
        db.commit()

    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.shop_id == current_shop.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.shop_id == current_shop.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if payload.sku and payload.sku.strip().upper() != product.sku:
        existing_sku = db.query(Product).filter(
            Product.shop_id == current_shop.id,
            Product.sku == payload.sku.strip().upper(),
            Product.id != product_id
        ).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{payload.sku}' is already used by another product."
            )
        product.sku = payload.sku.strip().upper()

    if payload.quick_code is not None:
        qc = payload.quick_code.strip() if payload.quick_code.strip() else None
        if qc and qc != product.quick_code:
            existing_qc = db.query(Product).filter(
                Product.shop_id == current_shop.id,
                Product.quick_code == qc,
                Product.is_active == True,
                Product.id != product_id
            ).first()
            if existing_qc:
                suggested_code = get_next_quick_code(db, current_shop.id)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Quick Code '{qc}' is already assigned to product '{existing_qc.name}'. Next available Quick Code is {suggested_code}."
                )
        product.quick_code = qc

    if payload.name is not None:
        product.name = payload.name.strip()
    if payload.category is not None:
        product.category = payload.category.strip()
    if payload.purchase_price is not None:
        product.purchase_price = payload.purchase_price
    if payload.selling_price is not None:
        product.selling_price = payload.selling_price
    if payload.gst_percentage is not None:
        product.gst_percentage = payload.gst_percentage
    if payload.low_stock_threshold is not None:
        product.low_stock_threshold = payload.low_stock_threshold
    if payload.description is not None:
        product.description = payload.description
    if payload.is_active is not None:
        product.is_active = payload.is_active

    # If manual stock override
    if payload.stock_quantity is not None and payload.stock_quantity != product.stock_quantity:
        prev = product.stock_quantity
        product.stock_quantity = payload.stock_quantity
        db.add(InventoryTransaction(
            shop_id=current_shop.id,
            product_id=product.id,
            transaction_type="STOCK_IN" if payload.stock_quantity > prev else "STOCK_OUT",
            quantity=abs(payload.stock_quantity - prev),
            previous_stock=prev,
            new_stock=payload.stock_quantity,
            reason="Manual Stock Adjustment"
        ))

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.shop_id == current_shop.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Soft delete / deactivate so historical invoices remain valid
    product.is_active = False
    db.commit()
    return None
