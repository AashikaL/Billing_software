import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Shop, Product, Customer, Invoice, InvoiceItem, Payment, InventoryTransaction
from app.schemas import InvoiceCreate, InvoiceResponse, InvoiceItemResponse
from app.dependencies import get_current_shop

router = APIRouter(prefix="/billing", tags=["POS Billing"])

def generate_invoice_number(db: Session, shop: Shop) -> str:
    prefix = shop.invoice_prefix if shop.invoice_prefix else "INV"
    year = datetime.datetime.utcnow().year
    
    # Count total invoices created by shop
    count = db.query(func.count(Invoice.id)).filter(Invoice.shop_id == shop.id).scalar() or 0
    next_num = count + 1
    return f"{prefix}-{year}-{next_num:04d}"


@router.post("/checkout", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def checkout_bill(
    payload: InvoiceCreate,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart cannot be empty.")

    # 1. Resolve or Create Customer
    customer_id = payload.customer_id
    customer_name = "Walk-in Customer"
    customer_phone = None

    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id, Customer.shop_id == current_shop.id).first()
        if customer:
            customer_name = customer.name
            customer_phone = customer.phone
    elif payload.customer_name and payload.customer_name.strip():
        # Quick create new customer if name supplied
        new_c = Customer(
            shop_id=current_shop.id,
            name=payload.customer_name.strip(),
            phone=payload.customer_phone.strip() if payload.customer_phone else None
        )
        db.add(new_c)
        db.flush()
        customer_id = new_c.id
        customer_name = new_c.name
        customer_phone = new_c.phone

    # 2. Validate products and calculate invoice totals
    inv_number = generate_invoice_number(db, current_shop)
    
    calculated_items = []
    subtotal = 0.0
    total_gst = 0.0

    for item_req in payload.items:
        product = db.query(Product).filter(
            Product.id == item_req.product_id,
            Product.shop_id == current_shop.id
        ).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product ID {item_req.product_id} not found in your catalogue."
            )

        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is inactive and cannot be billed."
            )

        if product.stock_quantity < item_req.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}, Requested: {item_req.quantity}."
            )

        item_unit_price = product.selling_price
        item_base_total = item_unit_price * item_req.quantity
        item_gst_amount = (item_base_total * product.gst_percentage) / 100.0
        item_final_total = item_base_total + item_gst_amount

        subtotal += item_base_total
        total_gst += item_gst_amount

        calculated_items.append({
            "product": product,
            "quantity": item_req.quantity,
            "unit_price": item_unit_price,
            "purchase_price": product.purchase_price,
            "gst_percentage": product.gst_percentage,
            "gst_amount": item_gst_amount,
            "total_amount": item_final_total
        })

    discount = payload.discount if payload.discount else 0.0
    grand_total = max(0.0, (subtotal + total_gst) - discount)

    # 3. Create Invoice Record
    invoice = Invoice(
        shop_id=current_shop.id,
        customer_id=customer_id,
        invoice_number=inv_number,
        subtotal=round(subtotal, 2),
        discount=round(discount, 2),
        gst_amount=round(total_gst, 2),
        total_amount=round(grand_total, 2),
        payment_method=payload.payment_method,
        status="Paid"
    )
    db.add(invoice)
    db.flush()

    response_items = []
    # 4. Create Invoice Items & Atomic Stock Reduction
    for c_item in calculated_items:
        prod = c_item["product"]
        qty = c_item["quantity"]

        item_record = InvoiceItem(
            invoice_id=invoice.id,
            product_id=prod.id,
            product_name_snapshot=prod.name,
            sku_snapshot=prod.sku,
            quantity=qty,
            unit_price=c_item["unit_price"],
            purchase_price_snapshot=c_item["purchase_price"],
            gst_percentage=c_item["gst_percentage"],
            gst_amount=round(c_item["gst_amount"], 2),
            total_amount=round(c_item["total_amount"], 2)
        )
        db.add(item_record)

        # Reduce stock
        prev_stock = prod.stock_quantity
        prod.stock_quantity -= qty

        # Log Inventory Transaction
        db.add(InventoryTransaction(
            shop_id=current_shop.id,
            product_id=prod.id,
            transaction_type="BILLING_SALE",
            quantity=qty,
            previous_stock=prev_stock,
            new_stock=prod.stock_quantity,
            reason=f"Invoice #{inv_number}"
        ))

    # 5. Record Payment
    payment = Payment(
        shop_id=current_shop.id,
        invoice_id=invoice.id,
        amount=invoice.total_amount,
        payment_method=payload.payment_method,
        payment_status="Completed"
    )
    db.add(payment)

    # Commit all changes atomically
    db.commit()
    db.refresh(invoice)

    # Prepare response items
    for item in invoice.items:
        response_items.append(InvoiceItemResponse.from_orm(item))

    return InvoiceResponse(
        id=invoice.id,
        shop_id=invoice.shop_id,
        customer_id=invoice.customer_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        invoice_number=invoice.invoice_number,
        subtotal=invoice.subtotal,
        discount=invoice.discount,
        gst_amount=invoice.gst_amount,
        total_amount=invoice.total_amount,
        payment_method=invoice.payment_method,
        status=invoice.status,
        created_at=invoice.created_at,
        items=response_items
    )
