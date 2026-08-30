import datetime
import random
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models import User, Shop, Product, Customer, Invoice, InvoiceItem, Payment, InventoryTransaction
from app.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Clear previous records for clean re-seed
        db.query(InventoryTransaction).delete()
        db.query(Payment).delete()
        db.query(InvoiceItem).delete()
        db.query(Invoice).delete()
        db.query(Product).delete()
        db.query(Customer).delete()
        db.query(Shop).delete()
        db.query(User).delete()
        db.commit()

        print("Seeding database with Sri Lakshmi Coffee & Bites cafe menu...")

        # 1. Create Demo User & Shop: Sri Lakshmi Coffee & Bites
        demo_user = User(
            name="Rajesh Kumar",
            email="demo@shop.com",
            phone="+91 98765 43210",
            password_hash=get_password_hash("password123")
        )
        db.add(demo_user)
        db.flush()

        demo_shop = Shop(
            owner_id=demo_user.id,
            shop_name="Sri Lakshmi Coffee & Bites",
            address="45 Commercial Street, Near City Circle",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
            gstin="29ABCDE1234F1Z5",
            invoice_prefix="SLCB"
        )
        db.add(demo_shop)
        db.flush()

        # 2. Create Demo Customers
        customers_data = [
            {"name": "Ananya Sharma", "phone": "9812345678", "email": "ananya@example.com", "address": "Jayanagar, Bengaluru"},
            {"name": "Vikram Sethi", "phone": "9845012345", "email": "vikram@example.com", "address": "Indiranagar, Bengaluru"},
            {"name": "Priya Nair", "phone": "9731298765", "email": "priya@example.com", "address": "Koramangala, Bengaluru"},
            {"name": "Rohan Deshmukh", "phone": "9900112233", "email": "rohan@example.com", "address": "Whitefield, Bengaluru"},
            {"name": "Meera Patel", "phone": "9611223344", "email": "meera@example.com", "address": "HSR Layout, Bengaluru"},
        ]
        
        customer_objs = []
        for c in customers_data:
            cust = Customer(shop_id=demo_shop.id, **c)
            db.add(cust)
            customer_objs.append(cust)
        db.flush()

        # 3. Create Tea, Coffee, Juices, Vada & Snacks Products for Sri Lakshmi Coffee & Bites
        products_data = [
            {"name": "Masala Ginger Tea", "sku": "BEV-TEA-002", "quick_code": "1", "category": "Hot Beverages", "purchase_price": 8.0, "selling_price": 20.0, "gst_percentage": 5.0, "stock_quantity": 150, "low_stock_threshold": 20, "description": "Hot brewed ginger cardamom tea"},
            {"name": "Special South Filter Coffee", "sku": "BEV-COF-001", "quick_code": "2", "category": "Hot Beverages", "purchase_price": 10.0, "selling_price": 25.0, "gst_percentage": 5.0, "stock_quantity": 120, "low_stock_threshold": 15, "description": "Authentic Kumbakonam degree filter coffee"},
            {"name": "Crispy Medu Vada (2 pcs)", "sku": "SNK-VAD-003", "quick_code": "3", "category": "Snacks", "purchase_price": 15.0, "selling_price": 35.0, "gst_percentage": 5.0, "stock_quantity": 4, "low_stock_threshold": 10, "description": "Golden fried lentil vada with coconut chutney"},  # Low stock
            {"name": "Sambar Vada Dip", "sku": "SNK-VAD-004", "quick_code": "4", "category": "Snacks", "purchase_price": 20.0, "selling_price": 45.0, "gst_percentage": 5.0, "stock_quantity": 35, "low_stock_threshold": 8, "description": "Crispy vada soaked in aromatic hot sambar"},
            {"name": "Fresh Mango Juice", "sku": "JUC-MNG-005", "quick_code": "5", "category": "Fresh Juices", "purchase_price": 25.0, "selling_price": 60.0, "gst_percentage": 5.0, "stock_quantity": 30, "low_stock_threshold": 5, "description": "Pure Alphonsa mango pulp juice"},
            {"name": "Cold Watermelon Juice", "sku": "JUC-WTR-006", "quick_code": "6", "category": "Fresh Juices", "purchase_price": 20.0, "selling_price": 50.0, "gst_percentage": 5.0, "stock_quantity": 25, "low_stock_threshold": 5, "description": "Freshly squeezed watermelon juice"},
            {"name": "Mysore Masala Dosa", "sku": "SNK-DOS-007", "quick_code": "7", "category": "Snacks", "purchase_price": 30.0, "selling_price": 75.0, "gst_percentage": 5.0, "stock_quantity": 40, "low_stock_threshold": 10, "description": "Crispy dosa with red chutney and potato stuffing"},
            {"name": "Crispy Onion Pakoda", "sku": "SNK-PAK-008", "quick_code": "8", "category": "Snacks", "purchase_price": 15.0, "selling_price": 40.0, "gst_percentage": 5.0, "stock_quantity": 3, "low_stock_threshold": 8, "description": "Deep fried onion fritters"},  # Low stock
            {"name": "Hot Badam Milk", "sku": "BEV-MIL-009", "quick_code": "9", "category": "Hot Beverages", "purchase_price": 18.0, "selling_price": 40.0, "gst_percentage": 5.0, "stock_quantity": 60, "low_stock_threshold": 10, "description": "Saffron almond hot milk"},
            {"name": "Filter Coffee + Vada Combo", "sku": "CMB-COF-010", "quick_code": "10", "category": "Combos", "purchase_price": 22.0, "selling_price": 55.0, "gst_percentage": 5.0, "stock_quantity": 50, "low_stock_threshold": 10, "description": "1 Filter Coffee + 2 Medu Vada combo offer"},
        ]

        product_objs = []
        for p in products_data:
            prod = Product(shop_id=demo_shop.id, **p)
            db.add(prod)
            product_objs.append(prod)
        db.flush()

        # Log initial inventory stock
        for prod in product_objs:
            db.add(InventoryTransaction(
                shop_id=demo_shop.id,
                product_id=prod.id,
                transaction_type="STOCK_IN",
                quantity=prod.stock_quantity,
                previous_stock=0,
                new_stock=prod.stock_quantity,
                reason="Initial Cafe Menu Seed"
            ))

        # 4. Generate Historical Invoices over the past 5 days
        now = datetime.datetime.utcnow()
        payment_methods = ["UPI", "Cash", "Card"]

        inv_counter = 1
        for day_offset in range(5, -1, -1):
            num_bills_today = random.randint(2, 4)
            inv_date = now - datetime.timedelta(days=day_offset, hours=random.randint(1, 6))

            for _ in range(num_bills_today):
                inv_num = f"SLCB-{inv_date.year}-{inv_counter:04d}"
                inv_counter += 1

                cust = random.choice(customer_objs)
                method = random.choice(payment_methods)

                selected_prods = random.sample(product_objs, random.randint(1, 3))
                
                subtotal = 0.0
                total_gst = 0.0
                item_records = []

                for prod in selected_prods:
                    qty = random.randint(1, 3)
                    unit_p = prod.selling_price
                    base_p = unit_p * qty
                    gst_amt = (base_p * prod.gst_percentage) / 100.0
                    tot_amt = base_p + gst_amt

                    subtotal += base_p
                    total_gst += gst_amt

                    item_records.append(InvoiceItem(
                        product_id=prod.id,
                        product_name_snapshot=prod.name,
                        sku_snapshot=prod.sku,
                        quantity=qty,
                        unit_price=unit_p,
                        purchase_price_snapshot=prod.purchase_price,
                        gst_percentage=prod.gst_percentage,
                        gst_amount=round(gst_amt, 2),
                        total_amount=round(tot_amt, 2)
                    ))

                disc = 10.0 if subtotal > 200 else 0.0
                grand_tot = max(0.0, (subtotal + total_gst) - disc)

                inv = Invoice(
                    shop_id=demo_shop.id,
                    customer_id=cust.id,
                    invoice_number=inv_num,
                    subtotal=round(subtotal, 2),
                    discount=round(disc, 2),
                    gst_amount=round(total_gst, 2),
                    total_amount=round(grand_tot, 2),
                    payment_method=method,
                    status="Paid",
                    created_at=inv_date
                )
                db.add(inv)
                db.flush()

                for item in item_records:
                    item.invoice_id = inv.id
                    db.add(item)

                db.add(Payment(
                    shop_id=demo_shop.id,
                    invoice_id=inv.id,
                    amount=inv.total_amount,
                    payment_method=method,
                    payment_status="Completed",
                    paid_at=inv_date
                ))

        db.commit()
        print("Database successfully seeded for Sri Lakshmi Coffee & Bites!")
        print("Demo Account Credentials:")
        print("Email: demo@shop.com")
        print("Password: password123")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
