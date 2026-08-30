import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { DashboardSummary, Invoice } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Shop Dashboard</h1>
          <p class="page-subtitle">Real-time financial performance and inventory snapshot</p>
        </div>
        <div class="page-actions">
          <a routerLink="/billing" class="btn btn-primary">⚡ Open Billing Terminal</a>
        </div>
      </div>

      <!-- Low Stock Warning Banner -->
      <div *ngIf="summary && summary.low_stock_products_count > 0" class="low-stock-alert">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <strong>Low Stock Alert!</strong> {{ summary.low_stock_products_count }} product(s) are below the threshold.
        </div>
        <a routerLink="/inventory" class="btn btn-secondary btn-sm">Restock Now</a>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-box">
        <div class="spinner"></div> Loading shop statistics...
      </div>

      <!-- KPI Summary Cards Grid -->
      <div *ngIf="summary" class="kpi-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-emerald">💰</div>
          <div class="stat-info">
            <span class="stat-label">Today's Sales</span>
            <span class="stat-value">₹{{ summary.today_sales | number:'1.2-2' }}</span>
            <span class="stat-sub">{{ summary.today_bills_count }} bill(s) generated today</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-primary">📈</div>
          <div class="stat-info">
            <span class="stat-label">Total Revenue</span>
            <span class="stat-value">₹{{ summary.total_revenue | number:'1.2-2' }}</span>
            <span class="stat-sub">Lifetime earned</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-rose">📦</div>
          <div class="stat-info">
            <span class="stat-label">Total Products</span>
            <span class="stat-value">{{ summary.total_products }}</span>
            <span class="stat-sub text-danger" *ngIf="summary.low_stock_products_count > 0">
              {{ summary.low_stock_products_count }} low in stock
            </span>
            <span class="stat-sub text-success" *ngIf="summary.low_stock_products_count === 0">
              All items healthy
            </span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-cyan">👥</div>
          <div class="stat-info">
            <span class="stat-label">Total Customers</span>
            <span class="stat-value">{{ summary.total_customers }}</span>
            <span class="stat-sub">Registered buyers</span>
          </div>
        </div>
      </div>

      <!-- Sales Chart & Top Selling Products -->
      <div *ngIf="summary" class="dashboard-grid">
        <!-- Sales Chart Card -->
        <div class="card chart-card">
          <div class="card-title">
            <span>📊 Daily Sales Breakdown (Last 7 Days)</span>
          </div>
          <div class="chart-bars">
            <div *ngFor="let item of summary.sales_chart" class="chart-col">
              <div class="bar-wrapper">
                <div class="bar-fill" [style.height.%]="getBarHeight(item.revenue)">
                  <span class="bar-val" *ngIf="item.revenue > 0">₹{{ item.revenue }}</span>
                </div>
              </div>
              <span class="bar-label">{{ item.date }}</span>
            </div>
          </div>
        </div>

        <!-- Top Selling Products Card -->
        <div class="card top-products-card">
          <div class="card-title">
            <span>🔥 Top Selling Products</span>
            <a routerLink="/products" class="view-all-link">View All</a>
          </div>
          <div *ngIf="summary.top_products.length === 0" class="empty-sm">No sales recorded yet.</div>
          <div class="top-list">
            <div *ngFor="let p of summary.top_products; let i = index" class="top-item">
              <div class="rank">{{ i + 1 }}</div>
              <div class="top-details">
                <span class="top-name">{{ p.name }}</span>
                <span class="top-qty">{{ p.total_qty }} units sold</span>
              </div>
              <div class="top-revenue">₹{{ p.total_revenue | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Transactions Table -->
      <div *ngIf="summary" class="card recent-card">
        <div class="card-title">
          <span>📄 Recent Bills / Invoices</span>
          <a routerLink="/invoices" class="view-all-link">View Full History</a>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Payment Method</th>
                <th>Total Amount</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of summary.recent_invoices">
                <td class="font-bold text-primary">{{ inv.invoice_number }}</td>
                <td>{{ inv.customer_name }}</td>
                <td>
                  <span class="badge badge-info">{{ inv.payment_method }}</span>
                </td>
                <td class="font-bold">₹{{ inv.total_amount | number:'1.2-2' }}</td>
                <td class="text-muted">{{ inv.created_at | date:'short' }}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="selectedInvoice = inv">View Invoice</button>
                </td>
              </tr>
              <tr *ngIf="summary.recent_invoices.length === 0">
                <td colspan="6" class="text-center py-4">No recent bills found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Invoice Detail Modal -->
      <div *ngIf="selectedInvoice" class="modal-backdrop" (click)="selectedInvoice = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Invoice #{{ selectedInvoice.invoice_number }}</h3>
            <button class="btn-close" (click)="selectedInvoice = null">×</button>
          </div>
          <div class="inv-modal-body">
            <p><strong>Customer:</strong> {{ selectedInvoice.customer_name }}</p>
            <p><strong>Payment Method:</strong> {{ selectedInvoice.payment_method }}</p>
            <p><strong>Date:</strong> {{ selectedInvoice.created_at | date:'medium' }}</p>

            <table class="table my-3">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of selectedInvoice.items">
                  <td>{{ item.product_name_snapshot }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>₹{{ item.unit_price }}</td>
                  <td>₹{{ item.total_amount }}</td>
                </tr>
              </tbody>
            </table>

            <div class="inv-totals">
              <div>Subtotal: ₹{{ selectedInvoice.subtotal }}</div>
              <div>GST Tax: ₹{{ selectedInvoice.gst_amount }}</div>
              <div *ngIf="selectedInvoice.discount > 0">Discount: -₹{{ selectedInvoice.discount }}</div>
              <div class="grand-tot">Grand Total: ₹{{ selectedInvoice.total_amount }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page { padding-bottom: 2rem; }
    .low-stock-alert {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .alert-icon { font-size: 1.5rem; }
    .alert-content { flex: 1; color: #92400E; font-size: 0.9rem; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }
    .stat-sub { font-size: 0.75rem; color: #64748B; margin-top: 0.15rem; }
    .text-danger { color: #E11D48 !important; font-weight: 700; }
    .text-success { color: #10B981 !important; font-weight: 700; }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.75rem;
    }
    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }
    .chart-card { min-height: 320px; display: flex; flex-direction: column; }
    .chart-bars {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      padding-top: 2rem;
      height: 200px;
    }
    .chart-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }
    .bar-wrapper {
      flex: 1;
      width: 100%;
      max-width: 48px;
      background: #F1F5F9;
      border-radius: 8px;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }
    .bar-fill {
      width: 100%;
      background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%);
      border-radius: 8px;
      transition: height 0.5s ease;
      position: relative;
    }
    .bar-val {
      position: absolute;
      top: -20px;
      width: 100%;
      text-align: center;
      font-size: 0.65rem;
      font-weight: 700;
      color: #4338CA;
    }
    .bar-label { font-size: 0.75rem; color: #64748B; margin-top: 0.5rem; font-weight: 600; }
    .view-all-link { font-size: 0.85rem; color: #4F46E5; text-decoration: none; font-weight: 700; }
    .top-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem; }
    .top-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem;
      background: #F8FAFC;
      border-radius: 8px;
    }
    .rank {
      width: 28px;
      height: 28px;
      background: #EEF2FF;
      color: #4F46E5;
      font-weight: 800;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
    }
    .top-details { flex: 1; min-width: 0; }
    .top-name { display: block; font-weight: 700; font-size: 0.85rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
    .top-qty { font-size: 0.75rem; color: #64748B; }
    .top-revenue { font-weight: 800; font-size: 0.9rem; color: #0F172A; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #4F46E5; }
    .text-muted { color: #64748B; }
    .inv-totals { text-align: right; margin-top: 1rem; border-top: 1px solid #E2E8F0; padding-top: 0.75rem; }
    .grand-tot { font-size: 1.1rem; font-weight: 800; color: #4F46E5; margin-top: 0.4rem; }
    .loading-box { text-align: center; padding: 3rem; color: #64748B; }
  `]
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);

  summary: DashboardSummary | null = null;
  isLoading = true;
  selectedInvoice: Invoice | null = null;

  ngOnInit() {
    this.apiService.getDashboardSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  getBarHeight(revenue: number): number {
    if (!this.summary || this.summary.sales_chart.length === 0) return 0;
    const maxRev = Math.max(...this.summary.sales_chart.map(c => c.revenue), 100);
    return Math.min(100, Math.max(10, (revenue / maxRev) * 100));
  }
}
