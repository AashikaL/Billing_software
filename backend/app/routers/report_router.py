import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Shop, Invoice, InvoiceItem, Customer, Product
from app.dependencies import get_current_shop

router = APIRouter(prefix="/reports", tags=["Reports & Financial Analytics"])

@router.get("/summary")
def get_reports_summary(
    range_type: str = Query("monthly", description="daily, weekly, monthly, custom"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    now = datetime.datetime.utcnow()
    
    if range_type == "daily":
        sd = now.replace(hour=0, minute=0, second=0, microsecond=0)
        ed = sd + datetime.timedelta(days=1)
    elif range_type == "weekly":
        sd = now - datetime.timedelta(days=7)
        ed = now
    elif range_type == "monthly":
        sd = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ed = now
    elif range_type == "custom" and start_date and end_date:
        try:
            sd = datetime.datetime.strptime(start_date, "%Y-%m-%d")
            ed = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
        except ValueError:
            sd = now - datetime.timedelta(days=30)
            ed = now
    else:
        sd = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ed = now

    # 1. Overall Sales Metrics
    invoices_query = db.query(Invoice).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.created_at >= sd,
        Invoice.created_at < ed
    )

    total_bills = invoices_query.count()
    subtotal_sum = invoices_query.with_entities(func.coalesce(func.sum(Invoice.subtotal), 0.0)).scalar() or 0.0
    discount_sum = invoices_query.with_entities(func.coalesce(func.sum(Invoice.discount), 0.0)).scalar() or 0.0
    gst_sum = invoices_query.with_entities(func.coalesce(func.sum(Invoice.gst_amount), 0.0)).scalar() or 0.0
    grand_total_sum = invoices_query.with_entities(func.coalesce(func.sum(Invoice.total_amount), 0.0)).scalar() or 0.0

    # 2. Profit Metrics: Revenue - Purchase Cost
    # Calculate from invoice items snapshots within timeframe
    item_stats = db.query(
        func.coalesce(func.sum(InvoiceItem.quantity * InvoiceItem.unit_price), 0.0).label("selling_revenue"),
        func.coalesce(func.sum(InvoiceItem.quantity * InvoiceItem.purchase_price_snapshot), 0.0).label("purchase_cost")
    ).join(Invoice, InvoiceItem.invoice_id == Invoice.id).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.created_at >= sd,
        Invoice.created_at < ed
    ).first()

    selling_revenue = item_stats.selling_revenue if item_stats else 0.0
    purchase_cost = item_stats.purchase_cost if item_stats else 0.0
    gross_profit = selling_revenue - purchase_cost

    # 3. GST Breakdown
    taxable_amount = subtotal_sum - discount_sum
    gst_report = {
        "taxable_amount": round(taxable_amount, 2),
        "gst_collected": round(gst_sum, 2),
        "total_revenue_incl_tax": round(grand_total_sum, 2)
    }

    # 4. Product Sales Breakdown
    product_sales_query = db.query(
        InvoiceItem.product_name_snapshot.label("product_name"),
        InvoiceItem.sku_snapshot.label("sku"),
        func.sum(InvoiceItem.quantity).label("total_quantity"),
        func.sum(InvoiceItem.total_amount).label("total_revenue")
    ).join(Invoice, InvoiceItem.invoice_id == Invoice.id).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.created_at >= sd,
        Invoice.created_at < ed
    ).group_by(InvoiceItem.product_name_snapshot, InvoiceItem.sku_snapshot)\
    .order_by(func.sum(InvoiceItem.total_amount).desc()).all()

    product_report = [
        {
            "product_name": row.product_name,
            "sku": row.sku,
            "quantity_sold": int(row.total_quantity or 0),
            "revenue": round(float(row.total_revenue or 0.0), 2)
        }
        for row in product_sales_query
    ]

    # 5. Customer Sales Breakdown
    customer_sales_query = db.query(
        Customer.name.label("customer_name"),
        Customer.phone.label("phone"),
        func.count(Invoice.id).label("total_orders"),
        func.sum(Invoice.total_amount).label("total_spent")
    ).join(Invoice, Customer.id == Invoice.customer_id).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.created_at >= sd,
        Invoice.created_at < ed
    ).group_by(Customer.id, Customer.name, Customer.phone)\
    .order_by(func.sum(Invoice.total_amount).desc()).all()

    customer_report = [
        {
            "customer_name": row.customer_name,
            "phone": row.phone or "-",
            "orders": int(row.total_orders or 0),
            "total_spent": round(float(row.total_spent or 0.0), 2)
        }
        for row in customer_sales_query
    ]

    return {
        "range_type": range_type,
        "start_date": sd.strftime("%Y-%m-%d"),
        "end_date": ed.strftime("%Y-%m-%d"),
        "summary": {
            "total_bills": total_bills,
            "subtotal": round(subtotal_sum, 2),
            "discount": round(discount_sum, 2),
            "gst_total": round(gst_sum, 2),
            "grand_total": round(grand_total_sum, 2),
            "total_purchase_cost": round(purchase_cost, 2),
            "gross_profit": round(gross_profit, 2)
        },
        "gst_report": gst_report,
        "product_report": product_report,
        "customer_report": customer_report
    }
