export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
  has_shop: boolean;
  shop_id?: number;
}

export interface Shop {
  id: number;
  owner_id: number;
  shop_name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  logo?: string;
  invoice_prefix: string;
  created_at: string;
}

export interface Product {
  id: number;
  shop_id: number;
  name: string;
  sku: string;
  quick_code?: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  gst_percentage: number;
  stock_quantity: number;
  low_stock_threshold: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  shop_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_orders?: number;
  total_spent?: number;
  created_at: string;
}

export interface InvoiceItem {
  id: number;
  product_id?: number;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: number;
  unit_price: number;
  purchase_price_snapshot: number;
  gst_percentage: number;
  gst_amount: number;
  total_amount: number;
}

export interface Invoice {
  id: number;
  shop_id: number;
  customer_id?: number;
  customer_name: string;
  customer_phone?: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  gst_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface InventoryTransaction {
  id: number;
  shop_id: number;
  product_id: number;
  product_name: string;
  transaction_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  created_at: string;
}

export interface SalesChartItem {
  date: string;
  revenue: number;
  bills: number;
}

export interface TopProductItem {
  name: string;
  total_qty: number;
  total_revenue: number;
}

export interface DashboardSummary {
  today_sales: number;
  today_bills_count: number;
  total_revenue: number;
  pending_payments: number;
  total_products: number;
  low_stock_products_count: number;
  total_customers: number;
  sales_chart: SalesChartItem[];
  top_products: TopProductItem[];
  recent_invoices: Invoice[];
}

export interface ReportSummary {
  range_type: string;
  start_date: string;
  end_date: string;
  summary: {
    total_bills: number;
    subtotal: number;
    discount: number;
    gst_total: number;
    grand_total: number;
    total_purchase_cost: number;
    gross_profit: number;
  };
  gst_report: {
    taxable_amount: number;
    gst_collected: number;
    total_revenue_incl_tax: number;
  };
  product_report: {
    product_name: string;
    sku: string;
    quantity_sold: number;
    revenue: number;
  }[];
  customer_report: {
    customer_name: string;
    phone: string;
    orders: number;
    total_spent: number;
  }[];
}

export interface AiQueryResponse {
  question: string;
  answer: string;
  related_data?: any;
}
