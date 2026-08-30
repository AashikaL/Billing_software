import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ReportSummary } from '../../core/models/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial & Business Reports</h1>
          <p class="page-subtitle">Detailed revenue breakdown, GST taxation, product sales, and gross profit analysis</p>
        </div>
      </div>

      <!-- Timeframe Filter Toolbar -->
      <div class="toolbar card">
        <div class="filter-row">
          <div class="range-btns">
            <button class="range-btn" [class.active]="rangeType === 'daily'" (click)="setRange('daily')">Daily</button>
            <button class="range-btn" [class.active]="rangeType === 'weekly'" (click)="setRange('weekly')">Weekly</button>
            <button class="range-btn" [class.active]="rangeType === 'monthly'" (click)="setRange('monthly')">Monthly</button>
            <button class="range-btn" [class.active]="rangeType === 'custom'" (click)="rangeType = 'custom'">Custom Range</button>
          </div>

          <div *ngIf="rangeType === 'custom'" class="custom-dates">
            <input type="date" class="form-control" [(ngModel)]="startDate" (change)="loadReport()" />
            <span>to</span>
            <input type="date" class="form-control" [(ngModel)]="endDate" (change)="loadReport()" />
          </div>
        </div>
      </div>

      <div *ngIf="isLoading" class="loading-box">
        <div class="spinner"></div> Generating financial report...
      </div>

      <!-- Summary KPI Grid -->
      <div *ngIf="reportData && !isLoading" class="kpi-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-emerald">💰</div>
          <div class="stat-info">
            <span class="stat-label">Total Revenue</span>
            <span class="stat-value">₹{{ reportData.summary.grand_total | number:'1.2-2' }}</span>
            <span class="stat-sub">{{ reportData.summary.total_bills }} bill(s) issued</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-primary">💵</div>
          <div class="stat-info">
            <span class="stat-label">Gross Profit</span>
            <span class="stat-value text-success">₹{{ reportData.summary.gross_profit | number:'1.2-2' }}</span>
            <span class="stat-sub">Revenue - Purchase Cost</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-amber">🏛️</div>
          <div class="stat-info">
            <span class="stat-label">GST Tax Collected</span>
            <span class="stat-value">₹{{ reportData.gst_report.gst_collected | number:'1.2-2' }}</span>
            <span class="stat-sub">Taxable: ₹{{ reportData.gst_report.taxable_amount | number:'1.2-2' }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-rose">🏷️</div>
          <div class="stat-info">
            <span class="stat-label">Total Discounts</span>
            <span class="stat-value">₹{{ reportData.summary.discount | number:'1.2-2' }}</span>
            <span class="stat-sub">Customer savings</span>
          </div>
        </div>
      </div>

      <!-- Report Tables Grid -->
      <div *ngIf="reportData && !isLoading" class="reports-grid">
        <!-- Product Sales Breakdown Card -->
        <div class="card">
          <h3 class="card-title">📦 Product Sales Breakdown</h3>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Quantity Sold</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of reportData.product_report">
                  <td class="font-bold">{{ item.product_name }}</td>
                  <td class="text-primary font-bold">{{ item.sku }}</td>
                  <td class="font-bold">{{ item.quantity_sold }}</td>
                  <td class="font-bold">₹{{ item.revenue | number:'1.2-2' }}</td>
                </tr>
                <tr *ngIf="reportData.product_report.length === 0">
                  <td colspan="4" class="text-center text-muted">No product sales in this timeframe.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Customer Sales Breakdown Card -->
        <div class="card">
          <h3 class="card-title">👥 Customer Sales Breakdown</h3>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cust of reportData.customer_report">
                  <td class="font-bold">{{ cust.customer_name }}</td>
                  <td>{{ cust.phone }}</td>
                  <td><span class="badge badge-info">{{ cust.orders }}</span></td>
                  <td class="font-bold text-success">₹{{ cust.total_spent | number:'1.2-2' }}</td>
                </tr>
                <tr *ngIf="reportData.customer_report.length === 0">
                  <td colspan="4" class="text-center text-muted">No customer transactions in this timeframe.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toolbar { margin-bottom: 1.5rem; }
    .filter-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .range-btns { display: flex; gap: 0.5rem; }
    .range-btn {
      padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #CBD5E1;
      background: white; font-weight: 700; cursor: pointer; color: #475569; font-size: 0.85rem;
    }
    .range-btn.active { background: #4F46E5; color: white; border-color: #4F46E5; }
    .custom-dates { display: flex; align-items: center; gap: 0.5rem; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem; margin-bottom: 1.75rem;
    }
    .reports-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 1024px) { .reports-grid { grid-template-columns: 1fr; } }
    .font-bold { font-weight: 700; }
    .text-primary { color: #4F46E5; }
    .text-success { color: #10B981; }
    .text-muted { color: #64748B; }
    .loading-box { text-align: center; padding: 3rem; color: #64748B; }
  `]
})
export class ReportsComponent implements OnInit {
  private apiService = inject(ApiService);

  reportData: ReportSummary | null = null;
  isLoading = true;

  rangeType = 'monthly';
  startDate = '';
  endDate = '';

  ngOnInit() {
    this.loadReport();
  }

  setRange(type: string) {
    this.rangeType = type;
    this.loadReport();
  }

  loadReport() {
    this.isLoading = true;
    this.apiService.getReportsSummary(this.rangeType, this.startDate, this.endDate).subscribe(data => {
      this.reportData = data;
      this.isLoading = false;
    });
  }
}
