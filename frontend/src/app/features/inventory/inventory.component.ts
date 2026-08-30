import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Product, InventoryTransaction } from '../../core/models/models';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="inventory-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Inventory & Stock Tracking</h1>
          <p class="page-subtitle">Manage stock levels, perform adjustments, and inspect transaction logs</p>
        </div>
        <button class="btn btn-primary" (click)="openAdjustmentModal()">+ Stock In / Out Adjustment</button>
      </div>

      <!-- Tab Buttons -->
      <div class="tabs">
        <button class="tab-btn" [class.active]="activeTab === 'stock'" (click)="activeTab = 'stock'">
          📦 Current Stock Levels
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'logs'" (click)="activeTab = 'logs'">
          📜 Audit Transaction Log
        </button>
      </div>

      <!-- Tab 1: Current Stock Levels -->
      <div *ngIf="activeTab === 'stock'" class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Low-Stock Limit</th>
                <th>Stock Status</th>
                <th>Quick Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of products">
                <td class="font-bold">{{ p.name }}</td>
                <td class="text-primary font-bold">{{ p.sku }}</td>
                <td>{{ p.category }}</td>
                <td class="font-bold font-lg">{{ p.stock_quantity }} units</td>
                <td>{{ p.low_stock_threshold }} units</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-danger]="p.stock_quantity <= p.low_stock_threshold"
                    [class.badge-success]="p.stock_quantity > p.low_stock_threshold"
                  >
                    {{ p.stock_quantity <= p.low_stock_threshold ? '⚠️ Low Stock' : 'Healthy Stock' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="quickStockIn(p)">+ Stock In</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: Inventory Audit Log -->
      <div *ngIf="activeTab === 'logs'" class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Previous Stock</th>
                <th>New Stock</th>
                <th>Reason / Invoice</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of transactions">
                <td class="text-muted">{{ log.created_at | date:'medium' }}</td>
                <td class="font-bold">{{ log.product_name }}</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-success]="log.transaction_type === 'STOCK_IN'"
                    [class.badge-danger]="log.transaction_type === 'STOCK_OUT'"
                    [class.badge-info]="log.transaction_type === 'BILLING_SALE'"
                  >
                    {{ log.transaction_type }}
                  </span>
                </td>
                <td class="font-bold">
                  {{ log.transaction_type === 'STOCK_IN' ? '+' : '-' }}{{ log.quantity }}
                </td>
                <td>{{ log.previous_stock }}</td>
                <td class="font-bold">{{ log.new_stock }}</td>
                <td class="text-muted">{{ log.reason || '-' }}</td>
              </tr>
              <tr *ngIf="transactions.length === 0">
                <td colspan="7" class="text-center py-4">No inventory transactions logged yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Adjustment Modal -->
      <div *ngIf="showModal" class="modal-backdrop" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Stock Adjustment</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>

          <form [formGroup]="adjForm" (ngSubmit)="onSubmitAdjustment()">
            <div class="form-group">
              <label class="form-label">Select Product *</label>
              <select class="form-control" formControlName="product_id">
                <option *ngFor="let p of products" [value]="p.id">
                  {{ p.name }} (Current: {{ p.stock_quantity }})
                </option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">Adjustment Type *</label>
                <select class="form-control" formControlName="adjustment_type">
                  <option value="STOCK_IN">STOCK IN (+ Add Stock)</option>
                  <option value="STOCK_OUT">STOCK OUT (- Remove Stock)</option>
                </select>
              </div>
              <div class="form-group col">
                <label class="form-label">Quantity *</label>
                <input type="number" class="form-control" formControlName="quantity" min="1" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Reason *</label>
              <input type="text" class="form-control" formControlName="reason" placeholder="New shipment arrived / Damage return" />
            </div>

            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>

            <button type="submit" class="btn btn-primary btn-block mt-3" [disabled]="adjForm.invalid || isSubmitting">
              {{ isSubmitting ? 'Saving...' : 'Apply Stock Adjustment' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
    .tab-btn {
      padding: 0.65rem 1.25rem; border-radius: 8px; border: 1px solid #CBD5E1;
      background: white; font-weight: 700; cursor: pointer; color: #475569; font-size: 0.9rem;
    }
    .tab-btn.active { background: #4F46E5; color: white; border-color: #4F46E5; }
    .font-bold { font-weight: 700; }
    .font-lg { font-size: 1rem; }
    .text-primary { color: #4F46E5; }
    .text-muted { color: #64748B; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .col { flex: 1; }
    .btn-block { width: 100%; }
    .alert-danger { background: #FEE2E2; color: #991B1B; padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; }
  `]
})
export class InventoryComponent implements OnInit {
  private apiService = inject(ApiService);
  private fb = inject(FormBuilder);

  products: Product[] = [];
  transactions: InventoryTransaction[] = [];
  activeTab: 'stock' | 'logs' = 'stock';

  showModal = false;
  isSubmitting = false;
  modalError = '';

  adjForm = this.fb.group({
    product_id: [null as number | null, Validators.required],
    adjustment_type: ['STOCK_IN', Validators.required],
    quantity: [5, [Validators.required, Validators.min(1)]],
    reason: ['Supplier Restock', Validators.required]
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiService.getProducts().subscribe(prods => {
      this.products = prods;
      if (this.products.length > 0 && !this.adjForm.value.product_id) {
        this.adjForm.patchValue({ product_id: this.products[0].id });
      }
    });
    this.apiService.getInventoryTransactions().subscribe(logs => this.transactions = logs);
  }

  openAdjustmentModal() {
    this.modalError = '';
    this.showModal = true;
  }

  quickStockIn(p: Product) {
    this.adjForm.patchValue({
      product_id: p.id,
      adjustment_type: 'STOCK_IN',
      quantity: 10,
      reason: 'Quick Restock'
    });
    this.openAdjustmentModal();
  }

  closeModal() { this.showModal = false; }

  onSubmitAdjustment() {
    if (this.adjForm.invalid) return;
    this.isSubmitting = true;
    this.modalError = '';

    this.apiService.adjustStock(this.adjForm.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showModal = false;
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.modalError = err.error?.detail || 'Stock adjustment failed.';
      }
    });
  }
}
