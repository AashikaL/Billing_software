import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Shop, Product, Customer, Invoice, InvoiceItem
from app.schemas import DashboardSummary, InvoiceResponse, InvoiceItemResponse
from app.dependencies import get_current_shop

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    now = datetime.datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    # Today's sales & bill count
    today_invoices = db.query(Invoice).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.created_at >= today_start,
        Invoice.created_at < today_end
    ).all()

    today_sales = sum(inv.total_amount for inv in today_invoices)
    today_bills_count = len(today_invoices)

    # Total Revenue
    total_revenue = db.query(func.coalesce(func.sum(Invoice.total_amount), 0.0)).filter(
        Invoice.shop_id == current_shop.id
    ).scalar() or 0.0

    # Pending Payments
    pending_payments = db.query(func.coalesce(func.sum(Invoice.total_amount), 0.0)).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.status == "Pending"
    ).scalar() or 0.0

    # Total Products & Low Stock
    total_products = db.query(func.count(Product.id)).filter(
        Product.shop_id == current_shop.id,
        Product.is_active == True
    ).scalar() or 0

    low_stock_products_count = db.query(func.count(Product.id)).filter(
        Product.shop_id == current_shop.id,
        Product.is_active == True,
        Product.stock_quantity <= Product.low_stock_threshold
    ).scalar() or 0

    # Total Customers
    total_customers = db.query(func.count(Customer.id)).filter(
        Customer.shop_id == current_shop.id
    ).scalar() or 0

    # Sales Chart (Last 7 Days)
    sales_chart = []
    for i in range(6, -1, -1):
        day_date = (now - datetime.timedelta(days=i)).date()
        d_start = datetime.datetime.combine(day_date, datetime.time.min)
        d_end = datetime.datetime.combine(day_date, datetime.time.max)

        day_stats = db.query(
            func.coalesce(func.sum(Invoice.total_amount), 0.0).label("rev"),
            func.count(Invoice.id).label("cnt")
        ).filter(
            Invoice.shop_id == current_shop.id,
            Invoice.created_at >= d_start,
            Invoice.created_at <= d_end
        ).first()

        sales_chart.append({
            "date": day_date.strftime("%b %d"),
            "revenue": round(float(day_stats.rev or 0.0), 2),
            "bills": int(day_stats.cnt or 0)
        })

    # Top 5 Selling Products
    top_prods_query = db.query(
        InvoiceItem.product_name_snapshot.label("name"),
        func.sum(InvoiceItem.quantity).label("total_qty"),
        func.sum(InvoiceItem.total_amount).label("total_revenue")
    ).join(Invoice, InvoiceItem.invoice_id == Invoice.id).filter(
        Invoice.shop_id == current_shop.id
    ).group_by(InvoiceItem.product_name_snapshot)\
    .order_by(func.sum(InvoiceItem.quantity).desc()).limit(5).all()

    top_products = [
        {
            "name": row.name,
            "total_qty": int(row.total_qty or 0),
            "total_revenue": round(float(row.total_revenue or 0.0), 2)
        }
        for row in top_prods_query
    ]

    # Recent 5 Invoices
    recent_invoices_models = db.query(Invoice).filter(
        Invoice.shop_id == current_shop.id
    ).order_by(Invoice.created_at.desc()).limit(5).all()

    recent_invoices = []
    for inv in recent_invoices_models:
        cust_name = inv.customer.name if inv.customer else "Walk-in Customer"
        recent_invoices.append(InvoiceResponse(
            id=inv.id,
            shop_id=inv.shop_id,
            customer_id=inv.customer_id,
            customer_name=cust_name,
            customer_phone=inv.customer.phone if inv.customer else None,
            invoice_number=inv.invoice_number,
            subtotal=inv.subtotal,
            discount=inv.discount,
            gst_amount=inv.gst_amount,
            total_amount=inv.total_amount,
            payment_method=inv.payment_method,
            status=inv.status,
            created_at=inv.created_at,
            items=[InvoiceItemResponse.from_orm(it) for it in inv.items]
        ))

    return DashboardSummary(
        today_sales=round(today_sales, 2),
        today_bills_count=today_bills_count,
        total_revenue=round(total_revenue, 2),
        pending_payments=round(pending_payments, 2),
        total_products=total_products,
        low_stock_products_count=low_stock_products_count,
        total_customers=total_customers,
        sales_chart=sales_chart,
        top_products=top_products,
        recent_invoices=recent_invoices
    )
