import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import {
  Product,
  Customer,
  Invoice,
  InventoryTransaction,
  DashboardSummary,
  ReportSummary,
  AiQueryResponse
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private get apiUrl(): string {
    const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return `http://${hostname}:8000/api`;
  }

  // --- Persistent Mock Data Store for Static / Mobile Deployment ---
  private defaultProducts: Product[] = [
    { id: 1, shop_id: 1, name: 'Special South Filter Coffee', sku: 'BEV-COF-001', quick_code: '1', category: 'Hot Beverages', purchase_price: 10, selling_price: 25, stock_quantity: 120, low_stock_threshold: 10, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, shop_id: 1, name: 'Masala Ginger Tea', sku: 'BEV-TEA-002', quick_code: '2', category: 'Hot Beverages', purchase_price: 8, selling_price: 20, stock_quantity: 85, low_stock_threshold: 10, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, shop_id: 1, name: 'Crispy Medu Vada (2 pcs)', sku: 'SNK-VAD-003', quick_code: '3', category: 'Snacks', purchase_price: 15, selling_price: 35, stock_quantity: 4, low_stock_threshold: 10, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, shop_id: 1, name: 'Ghee Sambar Idli (2 pcs)', sku: 'SNK-IDL-004', quick_code: '4', category: 'Snacks', purchase_price: 20, selling_price: 45, stock_quantity: 35, low_stock_threshold: 10, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, shop_id: 1, name: 'Butter Onion Rava Dosa', sku: 'SNK-DOS-005', quick_code: '5', category: 'Snacks', purchase_price: 30, selling_price: 70, stock_quantity: 25, low_stock_threshold: 5, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, shop_id: 1, name: 'Cold Watermelon Juice', sku: 'JUC-WTR-006', quick_code: '6', category: 'Fresh Juices', purchase_price: 20, selling_price: 50, stock_quantity: 18, low_stock_threshold: 5, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 7, shop_id: 1, name: 'Filter Coffee + Vada Combo', sku: 'CMB-CFV-007', quick_code: '7', category: 'Combos', purchase_price: 22, selling_price: 55, stock_quantity: 15, low_stock_threshold: 5, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 8, shop_id: 1, name: 'Crispy Onion Pakoda', sku: 'SNK-PAK-008', quick_code: '8', category: 'Snacks', purchase_price: 18, selling_price: 40, stock_quantity: 3, low_stock_threshold: 5, gst_percentage: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];

  private defaultCustomers: Customer[] = [
    { id: 1, shop_id: 1, name: 'Anand Kumar', phone: '9840123456', email: 'anand@gmail.com', total_orders: 14, total_spent: 3450, created_at: new Date().toISOString() },
    { id: 2, shop_id: 1, name: 'Priya Sundaram', phone: '9710987654', email: 'priya@gmail.com', total_orders: 8, total_spent: 1890, created_at: new Date().toISOString() },
    { id: 3, shop_id: 1, name: 'Karthik Raja', phone: '9940112233', total_orders: 5, total_spent: 1200, created_at: new Date().toISOString() }
  ];

  private defaultInvoices: Invoice[] = [
    { id: 1, shop_id: 1, invoice_number: 'INV-2026-0001', customer_name: 'Anand Kumar', customer_phone: '9840123456', subtotal: 120, gst_amount: 6, discount: 0, total_amount: 126, payment_method: 'Cash', status: 'paid', created_at: new Date().toISOString(), items: [{ id: 1, product_id: 1, product_name_snapshot: 'Special South Filter Coffee', sku_snapshot: 'BEV-COF-001', unit_price: 25, purchase_price_snapshot: 10, quantity: 2, gst_percentage: 5, gst_amount: 2.5, total_amount: 52.5 }] },
    { id: 2, shop_id: 1, invoice_number: 'INV-2026-0002', customer_name: 'Walk-in Customer', subtotal: 90, gst_amount: 4.5, discount: 0, total_amount: 94.5, payment_method: 'UPI', status: 'paid', created_at: new Date().toISOString(), items: [{ id: 2, product_id: 4, product_name_snapshot: 'Ghee Sambar Idli (2 pcs)', sku_snapshot: 'SNK-IDL-004', unit_price: 45, purchase_price_snapshot: 20, quantity: 2, gst_percentage: 5, gst_amount: 4.5, total_amount: 94.5 }] }
  ];

  private get mockProducts(): Product[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('pos_demo_products');
      if (raw) {
        try { return JSON.parse(raw); } catch (e) {}
      }
    }
    return this.defaultProducts;
  }

  private set mockProducts(items: Product[]) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { localStorage.setItem('pos_demo_products', JSON.stringify(items)); } catch (e) {}
    }
  }

  private get mockCustomers(): Customer[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('pos_demo_customers');
      if (raw) {
        try { return JSON.parse(raw); } catch (e) {}
      }
    }
    return this.defaultCustomers;
  }

  private set mockCustomers(items: Customer[]) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { localStorage.setItem('pos_demo_customers', JSON.stringify(items)); } catch (e) {}
    }
  }

  private get mockInvoices(): Invoice[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('pos_demo_invoices');
      if (raw) {
        try { return JSON.parse(raw); } catch (e) {}
      }
    }
    return this.defaultInvoices;
  }

  private set mockInvoices(items: Invoice[]) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { localStorage.setItem('pos_demo_invoices', JSON.stringify(items)); } catch (e) {}
    }
  }

  // --- Dashboard ---
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard/summary`).pipe(
      catchError(() => of({
        today_sales: 4250,
        today_bills_count: 18,
        total_revenue: 124500,
        pending_payments: 0,
        total_products: this.mockProducts.length,
        low_stock_products_count: this.mockProducts.filter(p => p.stock_quantity <= p.low_stock_threshold).length,
        total_customers: this.mockCustomers.length,
        sales_chart: [
          { date: 'Aug 24', revenue: 3800, bills: 15 },
          { date: 'Aug 25', revenue: 4100, bills: 16 },
          { date: 'Aug 26', revenue: 3950, bills: 14 },
          { date: 'Aug 27', revenue: 4600, bills: 19 },
          { date: 'Aug 28', revenue: 4900, bills: 21 },
          { date: 'Aug 29', revenue: 5200, bills: 22 },
          { date: 'Today', revenue: 4250, bills: 18 }
        ],
        top_products: [
          { name: 'Special South Filter Coffee', total_qty: 145, total_revenue: 3625 },
          { name: 'Crispy Medu Vada (2 pcs)', total_qty: 88, total_revenue: 3080 },
          { name: 'Butter Onion Rava Dosa', total_qty: 62, total_revenue: 4340 }
        ],
        recent_invoices: this.mockInvoices
      }))
    );
  }

  // --- Products ---
  getNextQuickCode(): Observable<{ next_quick_code: string }> {
    return this.http.get<{ next_quick_code: string }>(`${this.apiUrl}/products/next-quick-code`).pipe(
      catchError(() => of({ next_quick_code: (this.mockProducts.length + 1).toString() }))
    );
  }

  importProductsData(items: Product[]): void {
    if (Array.isArray(items) && items.length > 0) {
      this.mockProducts = items;
    }
  }

  getProducts(search?: string, category?: string, lowStockOnly?: boolean): Observable<Product[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);
    if (lowStockOnly) params = params.set('low_stock_only', 'true');
    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params }).pipe(
      catchError(() => {
        let list = [...this.mockProducts];
        if (category) list = list.filter(p => p.category === category);
        if (search) {
          const q = search.toLowerCase();
          list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        }
        if (lowStockOnly) list = list.filter(p => p.stock_quantity <= p.low_stock_threshold);
        return of(list);
      })
    );
  }

  createProduct(data: any): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, data).pipe(
      catchError(() => {
        const list = [...this.mockProducts];
        const newP: Product = {
          id: Date.now(),
          shop_id: 1,
          name: data.name,
          sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
          quick_code: data.quick_code || (list.length + 1).toString(),
          category: data.category || 'General',
          purchase_price: Number(data.purchase_price) || 0,
          selling_price: Number(data.selling_price) || 0,
          stock_quantity: Number(data.stock_quantity) || 0,
          low_stock_threshold: Number(data.low_stock_threshold) || 5,
          gst_percentage: Number(data.gst_percentage) || 5,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        list.unshift(newP);
        this.mockProducts = list;
        return of(newP);
      })
    );
  }

  updateProduct(id: number, data: any): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${id}`, data).pipe(
      catchError(() => {
        const list = [...this.mockProducts];
        const p = list.find(x => x.id === id);
        if (p) {
          Object.assign(p, data);
          this.mockProducts = list;
        }
        return of(p || data);
      })
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`).pipe(
      catchError(() => {
        this.mockProducts = this.mockProducts.filter(x => x.id !== id);
        return of(undefined as any);
      })
    );
  }

  // --- Customers ---
  getCustomers(search?: string): Observable<Customer[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<Customer[]>(`${this.apiUrl}/customers`, { params }).pipe(
      catchError(() => {
        let list = [...this.mockCustomers];
        if (search) {
          const q = search.toLowerCase();
          list = list.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.phone && c.phone.includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q))
          );
        }
        return of(list);
      })
    );
  }

  createCustomer(data: any): Observable<Customer> {
    return this.http.post<Customer>(`${this.apiUrl}/customers`, data).pipe(
      catchError(() => {
        const list = [...this.mockCustomers];
        const newC: Customer = {
          id: Date.now(),
          shop_id: 1,
          name: data.name,
          phone: data.phone,
          email: data.email,
          total_orders: 0,
          total_spent: 0,
          created_at: new Date().toISOString()
        };
        list.unshift(newC);
        this.mockCustomers = list;
        return of(newC);
      })
    );
  }

  updateCustomer(id: number, data: any): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/customers/${id}`, data).pipe(
      catchError(() => {
        const list = [...this.mockCustomers];
        const c = list.find(x => x.id === id);
        if (c) {
          Object.assign(c, data);
          this.mockCustomers = list;
        }
        return of(c || data);
      })
    );
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/customers/${id}`).pipe(
      catchError(() => {
        this.mockCustomers = this.mockCustomers.filter(x => x.id !== id);
        return of(undefined as any);
      })
    );
  }

  // --- POS Billing ---
  checkout(payload: any): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/billing/checkout`, payload).pipe(
      catchError(() => {
        let subtotal = 0;
        let totalGst = 0;
        const items = payload.items.map((itemPayload: any, idx: number) => {
          const prod = this.mockProducts.find(p => p.id === itemPayload.product_id) || this.mockProducts[0];
          if (prod.stock_quantity > 0) {
            prod.stock_quantity = Math.max(0, prod.stock_quantity - itemPayload.quantity);
          }
          const itemBase = prod.selling_price * itemPayload.quantity;
          const itemGst = (itemBase * prod.gst_percentage) / 100.0;
          subtotal += itemBase;
          totalGst += itemGst;
          return {
            id: idx + 1,
            product_id: prod.id,
            product_name_snapshot: prod.name,
            sku_snapshot: prod.sku,
            unit_price: prod.selling_price,
            purchase_price_snapshot: prod.purchase_price,
            quantity: itemPayload.quantity,
            gst_percentage: prod.gst_percentage,
            gst_amount: itemGst,
            total_amount: itemBase + itemGst
          };
        });

        const cust = this.mockCustomers.find(c => c.id === payload.customer_id);
        const grandTotal = Math.max(0, (subtotal + totalGst) - (payload.discount || 0));

        const invoiceNum = `INV-2026-${(this.mockInvoices.length + 1).toString().padStart(4, '0')}`;
        const newInvoice: Invoice = {
          id: Date.now(),
          shop_id: 1,
          invoice_number: invoiceNum,
          customer_name: cust ? cust.name : 'Walk-in Customer',
          customer_phone: cust ? cust.phone : undefined,
          subtotal: subtotal,
          gst_amount: totalGst,
          discount: payload.discount || 0,
          total_amount: grandTotal,
          payment_method: payload.payment_method || 'Cash',
          status: 'paid',
          created_at: new Date().toISOString(),
          items: items
        };

        this.mockInvoices.unshift(newInvoice);
        return of(newInvoice);
      })
    );
  }

  // --- Invoices / Bill History ---
  getInvoices(search?: string, customerId?: number, startDate?: string, endDate?: string, paymentMethod?: string): Observable<Invoice[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (customerId) params = params.set('customer_id', customerId.toString());
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (paymentMethod) params = params.set('payment_method', paymentMethod);
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices`, { params }).pipe(
      catchError(() => {
        let list = [...this.mockInvoices];
        if (search) {
          const q = search.toLowerCase();
          list = list.filter(i =>
            i.invoice_number.toLowerCase().includes(q) ||
            i.customer_name.toLowerCase().includes(q) ||
            (i.customer_phone && i.customer_phone.includes(q))
          );
        }
        if (customerId) {
          list = list.filter(i => i.customer_id === customerId);
        }
        if (paymentMethod) {
          list = list.filter(i => i.payment_method.toLowerCase() === paymentMethod.toLowerCase());
        }
        if (startDate) {
          list = list.filter(i => {
            const invDate = i.created_at.slice(0, 10);
            return invDate >= startDate;
          });
        }
        if (endDate) {
          list = list.filter(i => {
            const invDate = i.created_at.slice(0, 10);
            return invDate <= endDate;
          });
        }
        return of(list);
      })
    );
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${id}`).pipe(
      catchError(() => of(this.mockInvoices.find(i => i.id === id) || this.mockInvoices[0]))
    );
  }

  // --- Inventory ---
  getInventoryTransactions(productId?: number): Observable<InventoryTransaction[]> {
    let params = new HttpParams();
    if (productId) params = params.set('product_id', productId.toString());
    return this.http.get<InventoryTransaction[]>(`${this.apiUrl}/inventory/transactions`, { params }).pipe(
      catchError(() => of([
        { id: 1, shop_id: 1, product_id: 1, product_name: 'Special South Filter Coffee', transaction_type: 'stock_in', quantity: 50, previous_stock: 70, new_stock: 120, reason: 'New Stock Restock', created_at: new Date().toISOString() },
        { id: 2, shop_id: 1, product_id: 3, product_name: 'Crispy Medu Vada (2 pcs)', transaction_type: 'sale', quantity: -2, previous_stock: 6, new_stock: 4, reason: 'POS Sale #INV-2026-0001', created_at: new Date().toISOString() }
      ]))
    );
  }

  adjustStock(payload: any): Observable<InventoryTransaction> {
    return this.http.post<InventoryTransaction>(`${this.apiUrl}/inventory/adjust`, payload).pipe(
      catchError(() => {
        const productsList = [...this.mockProducts];
        const prod = productsList.find(p => p.id === payload.product_id);
        const prev = prod ? prod.stock_quantity : 0;
        const newStock = Math.max(0, prev + payload.quantity_change);
        if (prod) {
          prod.stock_quantity = newStock;
          this.mockProducts = productsList;
        }
        const trans: InventoryTransaction = {
          id: Date.now(),
          shop_id: 1,
          product_id: payload.product_id,
          product_name: prod ? prod.name : 'Product',
          transaction_type: payload.change_type || 'adjustment',
          quantity: payload.quantity_change,
          previous_stock: prev,
          new_stock: newStock,
          reason: payload.reason || 'Manual Adjustment',
          created_at: new Date().toISOString()
        };
        return of(trans);
      })
    );
  }

  getLowStockProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/inventory/low-stock`).pipe(
      catchError(() => of(this.mockProducts.filter(p => p.stock_quantity <= p.low_stock_threshold)))
    );
  }

  // --- Reports ---
  getReportsSummary(rangeType: string = 'monthly', startDate?: string, endDate?: string): Observable<ReportSummary> {
    let params = new HttpParams().set('range_type', rangeType);
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    return this.http.get<ReportSummary>(`${this.apiUrl}/reports/summary`, { params }).pipe(
      catchError(() => of({
        range_type: rangeType,
        start_date: startDate || new Date().toISOString(),
        end_date: endDate || new Date().toISOString(),
        summary: {
          total_bills: 240,
          subtotal: 124500,
          discount: 1200,
          gst_total: 6225,
          grand_total: 129525,
          total_purchase_cost: 61325,
          gross_profit: 68200
        },
        gst_report: {
          taxable_amount: 124500,
          gst_collected: 6225,
          total_revenue_incl_tax: 129525
        },
        product_report: [
          { product_name: 'Special South Filter Coffee', sku: 'BEV-COF-001', quantity_sold: 145, revenue: 3625 },
          { product_name: 'Crispy Medu Vada (2 pcs)', sku: 'SNK-VAD-003', quantity_sold: 88, revenue: 3080 }
        ],
        customer_report: [
          { customer_name: 'Anand Kumar', phone: '9840123456', orders: 14, total_spent: 3450 }
        ]
      }))
    );
  }

  // --- AI Assistant ---
  askAi(question: string): Observable<AiQueryResponse> {
    return this.http.post<AiQueryResponse>(`${this.apiUrl}/ai/query`, { question }).pipe(
      catchError(() => {
        const q = question.toLowerCase();
        let answer = "Based on your shop sales data: 'Special South Filter Coffee' is your top revenue generator with 145 items sold this month!";
        if (q.includes('low') || q.includes('stock')) {
          answer = "Low stock alert: 'Crispy Medu Vada' (4 left) and 'Crispy Onion Pakoda' (3 left) are running below reorder threshold!";
        } else if (q.includes('sales') || q.includes('today')) {
          answer = "Today's total sales stand at ₹4,250 across 18 bills generated.";
        }
        return of({ question, answer, related_data: { generated_sql: "SELECT * FROM sales WHERE shop_id = current_shop" } });
      })
    );
  }
}
