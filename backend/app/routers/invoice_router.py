import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import Shop, Invoice, Customer, InvoiceItem
from app.schemas import InvoiceResponse, InvoiceItemResponse
from app.dependencies import get_current_shop

router = APIRouter(prefix="/invoices", tags=["Invoices / Bill History"])

@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    search: Optional[str] = None,
    customer_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    payment_method: Optional[str] = None,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    query = db.query(Invoice).filter(Invoice.shop_id == current_shop.id)

    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    if search:
        s = f"%{search}%"
        # Join customer to search by customer name as well
        query = query.outerjoin(Customer).filter(
            or_(
                Invoice.invoice_number.ilike(s),
                Customer.name.ilike(s),
                Customer.phone.ilike(s)
            )
        )

    if payment_method:
        query = query.filter(Invoice.payment_method == payment_method)

    if start_date:
        try:
            sd = datetime.datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Invoice.created_at >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(Invoice.created_at < ed)
        except ValueError:
            pass

    invoices = query.order_by(Invoice.created_at.desc()).all()

    results = []
    for inv in invoices:
        cust_name = inv.customer.name if inv.customer else "Walk-in Customer"
        cust_phone = inv.customer.phone if inv.customer else None

        item_list = [InvoiceItemResponse.from_orm(it) for it in inv.items]
        results.append(InvoiceResponse(
            id=inv.id,
            shop_id=inv.shop_id,
            customer_id=inv.customer_id,
            customer_name=cust_name,
            customer_phone=cust_phone,
            invoice_number=inv.invoice_number,
            subtotal=inv.subtotal,
            discount=inv.discount,
            gst_amount=inv.gst_amount,
            total_amount=inv.total_amount,
            payment_method=inv.payment_method,
            status=inv.status,
            created_at=inv.created_at,
            items=item_list
        ))
    return results


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_by_id(
    invoice_id: int,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.shop_id == current_shop.id
    ).first()

    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    cust_name = inv.customer.name if inv.customer else "Walk-in Customer"
    cust_phone = inv.customer.phone if inv.customer else None
    item_list = [InvoiceItemResponse.from_orm(it) for it in inv.items]

    return InvoiceResponse(
        id=inv.id,
        shop_id=inv.shop_id,
        customer_id=inv.customer_id,
        customer_name=cust_name,
        customer_phone=cust_phone,
        invoice_number=inv.invoice_number,
        subtotal=inv.subtotal,
        discount=inv.discount,
        gst_amount=inv.gst_amount,
        total_amount=inv.total_amount,
        payment_method=inv.payment_method,
        status=inv.status,
        created_at=inv.created_at,
        items=item_list
    )
