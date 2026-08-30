from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Shop, Product, InventoryTransaction
from app.schemas import StockAdjustmentCreate, InventoryTransactionResponse, ProductResponse
from app.dependencies import get_current_shop

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("/transactions", response_model=List[InventoryTransactionResponse])
def get_inventory_transactions(
    product_id: Optional[int] = None,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    query = db.query(InventoryTransaction).filter(InventoryTransaction.shop_id == current_shop.id)
    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)
    
    logs = query.order_by(InventoryTransaction.created_at.desc()).all()
    results = []
    for log in logs:
        prod_name = log.product.name if log.product else "Deleted Product"
        results.append(InventoryTransactionResponse(
            id=log.id,
            shop_id=log.shop_id,
            product_id=log.product_id,
            product_name=prod_name,
            transaction_type=log.transaction_type,
            quantity=log.quantity,
            previous_stock=log.previous_stock,
            new_stock=log.new_stock,
            reason=log.reason,
            created_at=log.created_at
        ))
    return results


@router.post("/adjust", response_model=InventoryTransactionResponse)
def adjust_stock(
    payload: StockAdjustmentCreate,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == payload.product_id,
        Product.shop_id == current_shop.id
    ).first()

    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    adj_type = payload.adjustment_type.upper()
    if adj_type not in ["STOCK_IN", "STOCK_OUT"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment type must be either 'STOCK_IN' or 'STOCK_OUT'."
        )

    prev_stock = product.stock_quantity
    if adj_type == "STOCK_IN":
        new_stock = prev_stock + payload.quantity
    else:
        if prev_stock < payload.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot remove {payload.quantity} items. Current stock is only {prev_stock}."
            )
        new_stock = prev_stock - payload.quantity

    product.stock_quantity = new_stock

    log = InventoryTransaction(
        shop_id=current_shop.id,
        product_id=product.id,
        transaction_type=adj_type,
        quantity=payload.quantity,
        previous_stock=prev_stock,
        new_stock=new_stock,
        reason=payload.reason
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return InventoryTransactionResponse(
        id=log.id,
        shop_id=log.shop_id,
        product_id=log.product_id,
        product_name=product.name,
        transaction_type=log.transaction_type,
        quantity=log.quantity,
        previous_stock=log.previous_stock,
        new_stock=log.new_stock,
        reason=log.reason,
        created_at=log.created_at
    )


@router.get("/low-stock", response_model=List[ProductResponse])
def get_low_stock_products(
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    products = db.query(Product).filter(
        Product.shop_id == current_shop.id,
        Product.is_active == True,
        Product.stock_quantity <= Product.low_stock_threshold
    ).order_by(Product.stock_quantity.asc()).all()
    return products
