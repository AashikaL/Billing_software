from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=6)
    shop_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    has_shop: bool
    shop_id: Optional[int] = None


# --- Shop Schemas ---
class ShopCreateUpdate(BaseModel):
    shop_name: str = Field(..., min_length=2)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    logo: Optional[str] = None
    invoice_prefix: Optional[str] = "INV"

class ShopResponse(BaseModel):
    id: int
    owner_id: int
    shop_name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    logo: Optional[str] = None
    invoice_prefix: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Product Schemas ---
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    quick_code: Optional[str] = None
    category: Optional[str] = "General"
    purchase_price: float = Field(..., ge=0)
    selling_price: float = Field(..., ge=0)
    gst_percentage: float = Field(0.0, ge=0, le=100)
    stock_quantity: int = Field(0, ge=0)
    low_stock_threshold: int = Field(5, ge=0)
    description: Optional[str] = None
    is_active: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    quick_code: Optional[str] = None
    category: Optional[str] = None
    purchase_price: Optional[float] = Field(None, ge=0)
    selling_price: Optional[float] = Field(None, ge=0)
    gst_percentage: Optional[float] = Field(None, ge=0, le=100)
    stock_quantity: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: int
    shop_id: int
    name: str
    sku: str
    quick_code: Optional[str] = None
    category: Optional[str] = "General"
    purchase_price: float
    selling_price: float
    gst_percentage: float
    stock_quantity: int
    low_stock_threshold: int
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Customer Schemas ---
class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    shop_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    total_spent: Optional[float] = 0.0
    total_orders: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


# --- Billing & Invoice Schemas ---
class InvoiceItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class InvoiceCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[InvoiceItemCreate] = Field(..., min_items=1)
    discount: float = Field(0.0, ge=0)
    payment_method: str = "Cash"  # Cash, UPI, Card

class InvoiceItemResponse(BaseModel):
    id: int
    product_id: Optional[int]
    product_name_snapshot: str
    sku_snapshot: str
    quantity: int
    unit_price: float
    purchase_price_snapshot: float
    gst_percentage: float
    gst_amount: float
    total_amount: float

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: int
    shop_id: int
    customer_id: Optional[int] = None
    customer_name: Optional[str] = "Walk-in Customer"
    customer_phone: Optional[str] = None
    invoice_number: str
    subtotal: float
    discount: float
    gst_amount: float
    total_amount: float
    payment_method: str
    status: str
    created_at: datetime
    items: List[InvoiceItemResponse] = []

    class Config:
        from_attributes = True


# --- Inventory Schemas ---
class StockAdjustmentCreate(BaseModel):
    product_id: int
    adjustment_type: str  # STOCK_IN or STOCK_OUT
    quantity: int = Field(..., gt=0)
    reason: str

class InventoryTransactionResponse(BaseModel):
    id: int
    shop_id: int
    product_id: int
    product_name: Optional[str] = None
    transaction_type: str
    quantity: int
    previous_stock: int
    new_stock: int
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- AI Assistant Schemas ---
class AiQueryRequest(BaseModel):
    question: str = Field(..., min_length=2)

class AiQueryResponse(BaseModel):
    question: str
    answer: str
    related_data: Optional[dict] = None


# --- Dashboard & Reports Schemas ---
class DashboardSummary(BaseModel):
    today_sales: float
    today_bills_count: int
    total_revenue: float
    pending_payments: float
    total_products: int
    low_stock_products_count: int
    total_customers: int
    sales_chart: list  # list of {date: str, revenue: float, bills: int}
    top_products: list  # list of {name: str, total_qty: int, total_revenue: float}
    recent_invoices: List[InvoiceResponse] = []

class ReportFilter(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    report_type: str = "sales"  # sales, product, customer, gst, profit
