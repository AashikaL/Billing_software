# Multi-Tenant Billing & Inventory Management SaaS

A production-style **Billing & Inventory Management SaaS application** built for small businesses and shop owners. Designed with strict multi-tenant data isolation, POS billing terminal, automatic inventory stock tracking, PDF tax invoice generation, financial analytics, and an integrated database-driven AI business assistant.

---

## 🛠️ Technology Stack

- **Frontend**: Angular 19 / Standalone Components, TypeScript, Reactive Forms, RxJS, Modern Glassmorphism CSS Design System
- **Backend**: Python 3.14 / FastAPI, SQLAlchemy ORM, Pydantic v2 schemas, JWT Authentication, bcrypt security
- **Database**: PostgreSQL (with automatic SQLite fallback for zero-friction local testing)
- **AI Assistant**: OpenAI API / Database Analytical Engine answering natural language business questions using authenticated shop data

---

## 🚀 Quick Start Guide

### 1. Backend Setup & Run

1. Open PowerShell terminal in project root `d:\AI project\Billing_software`.
2. Activate virtual environment and run the backend server:
   ```powershell
   .\venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. API documentation is interactively available at: `http://localhost:8000/docs`.

### 2. Seed Demo Shop & Transactions

To populate realistic demo data (products, stock levels, customers, historical invoices, and sales chart metrics):
```powershell
.\venv\Scripts\python backend\seed.py
```

**Demo Credentials**:
- **Email**: `demo@shop.com`
- **Password**: `password123`

### 3. Frontend Setup & Run

1. Navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   npx ng serve --open
   ```
2. Open `http://localhost:4200` in your browser.

---

## ✨ Key Features & Capability Matrix

1. **Multi-Tenant SaaS Architecture**: Each user account maps to an isolated shop. APIs enforce tenant validation (`WHERE shop_id = current_shop.id`) at the backend layer.
2. **First-Time Shop Setup Wizard**: Shop details (address, city, state, pincode, GSTIN, invoice prefix) automatically appear on printed invoices.
3. **POS Billing Terminal**:
   - Product search by Name / SKU & Category filters.
   - Real-time stock validation & item quantity adjustment.
   - Auto calculations: Subtotal, GST percentage, item totals, discount, and Grand Total.
   - Payment modes: Cash, UPI, Card.
   - Walk-in or existing/new customer selection.
   - Unique invoice number generation (`INV-YYYY-XXXX`).
   - Instant printable tax invoice modal & PDF export (`window.print()`).
4. **Real Inventory Engine**:
   - Automatic atomic stock reduction upon successful checkout.
   - Low-stock alerts (`stock_quantity <= low_stock_threshold`).
   - Stock In / Stock Out manual adjustments with audit reason logging.
5. **Bill History**: Search invoices by invoice #, customer name, date range, or payment method.
6. **Financial Reports**: Daily, Weekly, Monthly, and Custom Range reporting for Sales, GST taxation, Product performance, Customer spending, and Gross Profit (`Revenue - Purchase Cost`).
7. **AI Business Assistant**:
   - Responds to natural language questions (e.g. *"What were my best-selling products this month?"*, *"Which products are low in stock?"*, *"How much did I sell today?"*).
   - Only accesses data belonging to the logged-in shop.
