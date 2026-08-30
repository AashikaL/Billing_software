import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Invoice, Shop } from '../../core/models/models';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="invoices-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Bill History & Invoices</h1>
          <p class="page-subtitle">View, search, print and export generated invoices</p>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="toolbar card">
        <div class="filter-row">
          <div class="form-group flex-2">
            <label class="form-label">Search Invoice / Customer</label>
            <input
              type="text"
              class="form-control"
              placeholder="Invoice # or Customer Name..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="loadInvoices()"
            />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Payment Method</label>
            <select class="form-control" [(ngModel)]="selectedPaymentMethod" (change)="loadInvoices()">
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Start Date</label>
            <input type="date" class="form-control" [(ngModel)]="startDate" (change)="loadInvoices()" />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">End Date</label>
            <input type="date" class="form-control" [(ngModel)]="endDate" (change)="loadInvoices()" />
          </div>
        </div>
      </div>

      <!-- Invoices List Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer Name</th>
                <th>Date & Time</th>
                <th>Subtotal</th>
                <th>GST Tax</th>
                <th>Discount</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices">
                <td class="font-bold text-primary">{{ inv.invoice_number }}</td>
                <td class="font-bold">{{ inv.customer_name }}</td>
                <td class="text-muted">{{ inv.created_at | date:'medium' }}</td>
                <td>₹{{ inv.subtotal | number:'1.2-2' }}</td>
                <td>₹{{ inv.gst_amount | number:'1.2-2' }}</td>
                <td class="text-danger" *ngIf="inv.discount > 0">-₹{{ inv.discount | number:'1.2-2' }}</td>
                <td *ngIf="inv.discount <= 0">-</td>
                <td class="font-bold font-lg text-dark">₹{{ inv.total_amount | number:'1.2-2' }}</td>
                <td><span class="badge badge-info">{{ inv.payment_method }}</span></td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="openInvoiceModal(inv)">View / Print</button>
                </td>
              </tr>
              <tr *ngIf="invoices.length === 0">
                <td colspan="9" class="text-center py-4">No matching invoices found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Invoice Detail & Print Modal -->
      <div *ngIf="selectedInvoice" class="modal-backdrop" (click)="selectedInvoice = null">
        <div class="modal-content invoice-modal-content" (click)="$event.stopPropagation()">
          <div class="no-print invoice-modal-actions">
            <button class="btn btn-primary" (click)="printInvoice()">🖨️ Print Invoice / PDF</button>
            <button class="btn btn-secondary" (click)="selectedInvoice = null">Close</button>
          </div>

          <!-- Printable Invoice Sheet -->
          <div class="printable-invoice">
            <div class="inv-header">
              <div class="shop-details">
                <h2>{{ currentShop?.shop_name }}</h2>
                <p>{{ currentShop?.address }}</p>
                <p>{{ currentShop?.city }}, {{ currentShop?.state }} - {{ currentShop?.pincode }}</p>
                <p *ngIf="currentShop?.gstin"><strong>GSTIN:</strong> {{ currentShop?.gstin }}</p>
              </div>
              <div class="inv-meta">
                <div class="inv-badge">TAX INVOICE</div>
                <p><strong>Invoice No:</strong> {{ selectedInvoice.invoice_number }}</p>
                <p><strong>Date:</strong> {{ selectedInvoice.created_at | date:'medium' }}</p>
                <p><strong>Payment Method:</strong> {{ selectedInvoice.payment_method }}</p>
              </div>
            </div>

            <hr class="inv-divider" />

            <div class="cust-details">
              <p><strong>Billed To:</strong> {{ selectedInvoice.customer_name }}</p>
              <p *ngIf="selectedInvoice.customer_phone"><strong>Phone:</strong> {{ selectedInvoice.customer_phone }}</p>
            </div>

            <table class="inv-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Description</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>GST %</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of selectedInvoice.items; let idx = index">
                  <td>{{ idx + 1 }}</td>
                  <td>{{ item.product_name_snapshot }}</td>
                  <td>{{ item.sku_snapshot }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>₹{{ item.unit_price | number:'1.2-2' }}</td>
                  <td>{{ item.gst_percentage }}%</td>
                  <td>₹{{ item.total_amount | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="inv-summary">
              <div class="inv-summary-box">
                <div class="sum-row"><span>Subtotal:</span> <span>₹{{ selectedInvoice.subtotal | number:'1.2-2' }}</span></div>
                <div class="sum-row"><span>GST Tax Total:</span> <span>₹{{ selectedInvoice.gst_amount | number:'1.2-2' }}</span></div>
                <div class="sum-row" *ngIf="selectedInvoice.discount > 0"><span>Discount:</span> <span>-₹{{ selectedInvoice.discount | number:'1.2-2' }}</span></div>
                <div class="sum-row total"><span>Grand Total:</span> <span>₹{{ selectedInvoice.total_amount | number:'1.2-2' }}</span></div>
              </div>
            </div>

            <div class="inv-footer">
              <p>Thank you for shopping with us!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toolbar { margin-bottom: 1.5rem; }
    .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .flex-1 { flex: 1; min-width: 150px; }
    .flex-2 { flex: 2; min-width: 250px; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #4F46E5; }
    .text-dark { color: #0F172A; }
    .font-lg { font-size: 1rem; }
    .text-muted { color: #64748B; }
    .text-danger { color: #E11D48; }

    /* Printable Invoice Sheet */
    .invoice-modal-content { max-width: 800px; padding: 2rem; }
    .invoice-modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-bottom: 1.5rem; }
    .printable-invoice { background: white; padding: 2rem; border: 1px solid #E2E8F0; border-radius: 8px; color: #0F172A; }
    .inv-header { display: flex; justify-content: space-between; }
    .shop-details h2 { font-size: 1.4rem; font-weight: 800; color: #1E1B4B; }
    .shop-details p { font-size: 0.85rem; color: #475569; }
    .inv-meta { text-align: right; font-size: 0.85rem; }
    .inv-badge { background: #312E81; color: white; font-weight: 800; padding: 0.25rem 0.75rem; border-radius: 4px; display: inline-block; margin-bottom: 0.5rem; }
    .inv-divider { margin: 1.25rem 0; border: none; border-top: 1px solid #E2E8F0; }
    .cust-details { font-size: 0.9rem; margin-bottom: 1.25rem; }
    .inv-items-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.85rem; }
    .inv-items-table th { background: #F1F5F9; padding: 0.6rem; border-bottom: 2px solid #CBD5E1; text-align: left; }
    .inv-items-table td { padding: 0.6rem; border-bottom: 1px solid #E2E8F0; }
    .inv-summary { display: flex; justify-content: flex-end; }
    .inv-summary-box { width: 280px; font-size: 0.9rem; }
    .sum-row { display: flex; justify-content: space-between; padding: 0.3rem 0; }
    .sum-row.total { font-weight: 800; font-size: 1.1rem; border-top: 2px solid #0F172A; margin-top: 0.4rem; padding-top: 0.4rem; color: #4F46E5; }
    .inv-footer { margin-top: 2.5rem; text-align: center; font-size: 0.85rem; color: #64748B; border-top: 1px dashed #E2E8F0; padding-top: 1rem; }
  `]
})
export class InvoicesComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  invoices: Invoice[] = [];
  currentShop: Shop | null = null;

  searchQuery = '';
  selectedPaymentMethod = '';
  startDate = '';
  endDate = '';

  selectedInvoice: Invoice | null = null;

  ngOnInit() {
    this.authService.currentShop$.subscribe(s => this.currentShop = s);
    this.loadInvoices();
  }

  loadInvoices() {
    this.apiService.getInvoices(
      this.searchQuery, undefined, this.startDate, this.endDate, this.selectedPaymentMethod
    ).subscribe(data => this.invoices = data);
  }

  openInvoiceModal(inv: Invoice) {
    this.selectedInvoice = inv;
  }

  printInvoice() {
    window.print();
  }
}
