import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.config import settings
from app.models import Shop, Product, Customer, Invoice, InvoiceItem
from app.schemas import AiQueryRequest, AiQueryResponse
from app.dependencies import get_current_shop

router = APIRouter(prefix="/ai", tags=["AI Business Assistant"])

@router.post("/query", response_model=AiQueryResponse)
def ask_ai_assistant(
    payload: AiQueryRequest,
    current_shop: Shop = Depends(get_current_shop),
    db: Session = Depends(get_db)
):
    question = payload.question.strip()
    q_lower = question.lower()
    now = datetime.datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Fetch current shop's database metrics strictly for current_shop.id
    # Products context
    products = db.query(Product).filter(Product.shop_id == current_shop.id, Product.is_active == True).all()
    low_stock = [p for p in products if p.stock_quantity <= p.low_stock_threshold]
    
    # Today's sales
    today_invoices = db.query(Invoice).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.created_at >= today_start
    ).all()
    today_rev = sum(i.total_amount for i in today_invoices)

    # Month sales
    month_invoices = db.query(Invoice).filter(
        Invoice.shop_id == current_shop.id,
        Invoice.created_at >= month_start
    ).all()
    month_rev = sum(i.total_amount for i in month_invoices)

    # Best selling products
    top_prods_query = db.query(
        InvoiceItem.product_name_snapshot.label("name"),
        func.sum(InvoiceItem.quantity).label("total_qty"),
        func.sum(InvoiceItem.total_amount).label("total_rev")
    ).join(Invoice, InvoiceItem.invoice_id == Invoice.id).filter(
        Invoice.shop_id == current_shop.id
    ).group_by(InvoiceItem.product_name_snapshot)\
    .order_by(func.sum(InvoiceItem.quantity).desc()).limit(5).all()

    # Top customer
    top_cust_query = db.query(
        Customer.name.label("name"),
        func.count(Invoice.id).label("orders"),
        func.sum(Invoice.total_amount).label("spent")
    ).join(Invoice, Customer.id == Invoice.customer_id).filter(
        Invoice.shop_id == current_shop.id
    ).group_by(Customer.id, Customer.name)\
    .order_by(func.sum(Invoice.total_amount).desc()).first()

    # Profit metric
    profit_stats = db.query(
        func.coalesce(func.sum(InvoiceItem.quantity * InvoiceItem.unit_price), 0.0).label("rev"),
        func.coalesce(func.sum(InvoiceItem.quantity * InvoiceItem.purchase_price_snapshot), 0.0).label("cost")
    ).join(Invoice, InvoiceItem.invoice_id == Invoice.id).filter(
        Invoice.shop_id == current_shop.id
    ).first()
    
    total_rev_all = profit_stats.rev if profit_stats else 0.0
    total_cost_all = profit_stats.cost if profit_stats else 0.0
    total_profit_all = total_rev_all - total_cost_all

    # 2. Try OpenAI API if key is present
    if settings.OPENAI_API_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            
            context_prompt = f"""
            You are an AI Business Assistant for '{current_shop.shop_name}'.
            Answer the owner's question using ONLY the following verified shop database statistics:
            - Shop Name: {current_shop.shop_name}
            - Today's Sales: ₹{today_rev:.2f} ({len(today_invoices)} bills)
            - This Month's Revenue: ₹{month_rev:.2f} ({len(month_invoices)} bills)
            - Total All-Time Profit: ₹{total_profit_all:.2f} (Revenue: ₹{total_rev_all:.2f}, Cost: ₹{total_cost_all:.2f})
            - Low Stock Products ({len(low_stock)}): {', '.join([f'{p.name} (Qty: {p.stock_quantity})' for p in low_stock]) if low_stock else 'None'}
            - Top Selling Products: {', '.join([f'{tp.name} ({int(tp.total_qty or 0)} sold)' for tp in top_prods_query]) if top_prods_query else 'None'}
            - Top Customer: {top_cust_query.name if top_cust_query else 'None'} (Spent: ₹{top_cust_query.spent if top_cust_query else 0:.2f})

            Question: {question}
            Format answer cleanly with bold text and bullet points. Be concise and friendly.
            """

            completion = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a professional business advisor AI."},
                    {"role": "user", "content": context_prompt}
                ]
            )
            ans = completion.choices[0].message.content
            return AiQueryResponse(question=question, answer=ans)
        except Exception as e:
            # Fall back to local DB engine if OpenAI fails or key invalid
            pass

    # 3. Intelligent Database Parser Fallback
    answer = ""
    related_data = {}

    if "best" in q_lower or "top" in q_lower or "selling" in q_lower:
        if top_prods_query:
            prod_lines = "\n".join([f"• **{p.name}**: {int(p.total_qty or 0)} units sold (Revenue: ₹{float(p.total_rev or 0):.2f})" for p in top_prods_query])
            answer = f"Here are your top-selling products for **{current_shop.shop_name}**:\n\n{prod_lines}"
            related_data = {"top_products": [{"name": p.name, "qty": int(p.total_qty or 0)} for p in top_prods_query]}
        else:
            answer = f"No sales data recorded yet for **{current_shop.shop_name}**. Start billing products to view best sellers!"

    elif "low" in q_lower or "stock" in q_lower or "inventory" in q_lower:
        if low_stock:
            items_str = "\n".join([f"• **{p.name}** (SKU: {p.sku}) - Current Stock: **{p.stock_quantity}** (Threshold: {p.low_stock_threshold})" for p in low_stock])
            answer = f"⚠️ You currently have **{len(low_stock)} product(s)** low in stock for **{current_shop.shop_name}**:\n\n{items_str}\n\nPlease restock these items soon!"
            related_data = {"low_stock_count": len(low_stock)}
        else:
            answer = f"✅ All products for **{current_shop.shop_name}** are sufficiently stocked! No low-stock alerts right now."

    elif "today" in q_lower:
        answer = f"📊 **Today's Business Summary for {current_shop.shop_name}**:\n\n• **Total Sales**: ₹{today_rev:.2f}\n• **Total Bills Generated**: {len(today_invoices)}"

    elif "month" in q_lower or "revenue" in q_lower:
        answer = f"📈 **Monthly Financial Summary for {current_shop.shop_name}**:\n\n• **This Month's Revenue**: ₹{month_rev:.2f}\n• **Invoices Issued**: {len(month_invoices)} bills"

    elif "customer" in q_lower:
        if top_cust_query:
            answer = f"👑 Your top customer for **{current_shop.shop_name}** is **{top_cust_query.name}** with **{top_cust_query.orders} orders** totaling **₹{float(top_cust_query.spent or 0):.2f}**!"
        else:
            answer = f"No customer purchase records found yet for **{current_shop.shop_name}**."

    elif "profit" in q_lower or "margin" in q_lower:
        answer = f"💰 **Profit Analytics for {current_shop.shop_name}**:\n\n• **Gross Profit**: ₹{total_profit_all:.2f}\n• **Total Revenue**: ₹{total_rev_all:.2f}\n• **Total Cost of Goods**: ₹{total_cost_all:.2f}"

    else:
        answer = (
            f"Here is a quick snapshot for **{current_shop.shop_name}**:\n\n"
            f"• **Today's Revenue**: ₹{today_rev:.2f}\n"
            f"• **This Month's Revenue**: ₹{month_rev:.2f}\n"
            f"• **Total Active Products**: {len(products)}\n"
            f"• **Low-Stock Alerts**: {len(low_stock)}\n"
            f"• **Gross Profit**: ₹{total_profit_all:.2f}\n\n"
            f"Ask me questions like: *'Which products are low in stock?'*, *'What were my best selling products?'*, or *'Show me today's sales.'*"
        )

    return AiQueryResponse(question=question, answer=answer, related_data=related_data)
