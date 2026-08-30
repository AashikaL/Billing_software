import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  // --- Dashboard ---
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard/summary`);
  }

  // --- Products ---
  getNextQuickCode(): Observable<{ next_quick_code: string }> {
    return this.http.get<{ next_quick_code: string }>(`${this.apiUrl}/products/next-quick-code`);
  }

  getProducts(search?: string, category?: string, lowStockOnly?: boolean): Observable<Product[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);
    if (lowStockOnly) params = params.set('low_stock_only', 'true');
    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params });
  }

  createProduct(data: any): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, data);
  }

  updateProduct(id: number, data: any): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${id}`, data);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`);
  }

  // --- Customers ---
  getCustomers(search?: string): Observable<Customer[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<Customer[]>(`${this.apiUrl}/customers`, { params });
  }

  createCustomer(data: any): Observable<Customer> {
    return this.http.post<Customer>(`${this.apiUrl}/customers`, data);
  }

  updateCustomer(id: number, data: any): Observable<Customer> {
    return this.http.put<Customer>(`${this.apiUrl}/customers/${id}`, data);
  }

  deleteCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/customers/${id}`);
  }

  // --- POS Billing ---
  checkout(payload: any): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/billing/checkout`, payload);
  }

  // --- Invoices / Bill History ---
  getInvoices(search?: string, customerId?: number, startDate?: string, endDate?: string, paymentMethod?: string): Observable<Invoice[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (customerId) params = params.set('customer_id', customerId.toString());
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (paymentMethod) params = params.set('payment_method', paymentMethod);
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices`, { params });
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${id}`);
  }

  // --- Inventory ---
  getInventoryTransactions(productId?: number): Observable<InventoryTransaction[]> {
    let params = new HttpParams();
    if (productId) params = params.set('product_id', productId.toString());
    return this.http.get<InventoryTransaction[]>(`${this.apiUrl}/inventory/transactions`, { params });
  }

  adjustStock(payload: any): Observable<InventoryTransaction> {
    return this.http.post<InventoryTransaction>(`${this.apiUrl}/inventory/adjust`, payload);
  }

  getLowStockProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/inventory/low-stock`);
  }

  // --- Reports ---
  getReportsSummary(rangeType: string = 'monthly', startDate?: string, endDate?: string): Observable<ReportSummary> {
    let params = new HttpParams().set('range_type', rangeType);
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    return this.http.get<ReportSummary>(`${this.apiUrl}/reports/summary`, { params });
  }

  // --- AI Assistant ---
  askAi(question: string): Observable<AiQueryResponse> {
    return this.http.post<AiQueryResponse>(`${this.apiUrl}/ai/query`, { question });
  }
}
