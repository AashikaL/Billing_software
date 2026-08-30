import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Product } from '../../core/models/models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="products-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Product Catalogue</h1>
          <p class="page-subtitle">Manage items, pricing, GST percentages, and stock limits</p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">+ Add New Product</button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="toolbar card">
        <div class="search-box">
          <input
            type="text"
            class="form-control"
            placeholder="Search by Product Name or SKU..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="loadProducts()"
          />
        </div>

        <div class="filter-group">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="lowStockOnly" (change)="loadProducts()" />
            ⚠️ Show Low Stock Only
          </label>
        </div>
      </div>

      <!-- Product Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Quick Code</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>GST %</th>
                <th>Stock Quantity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of products">
                <td><span class="quick-code-badge">{{ p.quick_code ? '#' + p.quick_code : '-' }}</span></td>
                <td class="font-bold">{{ p.name }}</td>
                <td class="text-primary font-bold">{{ p.sku }}</td>
                <td>{{ p.category }}</td>
                <td>₹{{ p.purchase_price | number:'1.2-2' }}</td>
                <td class="font-bold">₹{{ p.selling_price | number:'1.2-2' }}</td>
                <td>{{ p.gst_percentage }}%</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-danger]="p.stock_quantity <= p.low_stock_threshold"
                    [class.badge-success]="p.stock_quantity > p.low_stock_threshold"
                  >
                    {{ p.stock_quantity }} units
                  </span>
                </td>
                <td>
                  <span class="badge" [class.badge-success]="p.is_active" [class.badge-danger]="!p.is_active">
                    {{ p.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="action-btn-group">
                    <button class="btn btn-secondary btn-sm" (click)="openEditModal(p)">Edit</button>
                    <button class="btn btn-danger btn-sm" (click)="deleteProduct(p)">Delete</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="products.length === 0">
                <td colspan="10" class="text-center py-4">
                  No products available. Click "+ Add New Product" to start billing.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add / Edit Product Modal -->
      <div *ngIf="showModal" class="modal-backdrop" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ editingProduct ? 'Edit Product' : 'Add New Product' }}</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>

          <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group col-4">
                <label class="form-label">Quick Code (e.g. 1, 2) ⚡</label>
                <input
                  type="text"
                  class="form-control"
                  [class.is-invalid]="quickCodeConflict?.isDuplicate"
                  formControlName="quick_code"
                  placeholder="1"
                  (input)="checkQuickCodeAvailability()"
                />
                <div *ngIf="quickCodeConflict?.isDuplicate" class="qc-feedback error">
                  <span>❌ Code '#{{ productForm.value.quick_code }}' is used by <strong>{{ quickCodeConflict?.existingProductName }}</strong>! Cannot add.</span>
                  <button type="button" class="btn-use-suggested" (click)="useSuggestedQuickCode()">
                    💡 Use suggested code: {{ suggestedQuickCode }}
                  </button>
                </div>
                <div *ngIf="productForm.value.quick_code && !quickCodeConflict?.isDuplicate" class="qc-feedback success">
                  ✓ Code '#{{ productForm.value.quick_code }}' is available!
                </div>
              </div>
              <div class="form-group col-8">
                <label class="form-label">Product Name *</label>
                <input
                  type="text"
                  class="form-control"
                  [class.is-invalid]="productForm.get('name')?.touched && productForm.get('name')?.invalid"
                  formControlName="name"
                  placeholder="Masala Tea"
                />
                <div *ngIf="productForm.get('name')?.touched && productForm.get('name')?.invalid" class="field-error">
                  ❌ Product Name is required (min 2 chars).
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">SKU / Code *</label>
                <input
                  type="text"
                  class="form-control"
                  [class.is-invalid]="(productForm.get('sku')?.touched && productForm.get('sku')?.invalid) || skuConflict?.isDuplicate"
                  formControlName="sku"
                  placeholder="MS-001"
                  (input)="checkSkuAvailability()"
                />
                <div *ngIf="productForm.get('sku')?.touched && productForm.get('sku')?.invalid" class="field-error">
                  ❌ SKU / Code is required.
                </div>
                <div *ngIf="skuConflict?.isDuplicate" class="qc-feedback error">
                  ❌ SKU '{{ productForm.value.sku }}' is used by <strong>{{ skuConflict?.existingProductName }}</strong>!
                </div>
              </div>
              <div class="form-group col">
                <label class="form-label">Category</label>
                <input type="text" class="form-control" formControlName="category" placeholder="General" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">Purchase Price (₹) *</label>
                <input
                  type="number"
                  class="form-control"
                  [class.is-invalid]="productForm.get('purchase_price')?.touched && productForm.get('purchase_price')?.invalid"
                  formControlName="purchase_price"
                  min="0"
                  step="0.01"
                />
                <div *ngIf="productForm.get('purchase_price')?.touched && productForm.get('purchase_price')?.invalid" class="field-error">
                  ❌ Purchase price cannot be negative.
                </div>
              </div>
              <div class="form-group col">
                <label class="form-label">Selling Price (₹) *</label>
                <input
                  type="number"
                  class="form-control"
                  [class.is-invalid]="productForm.get('selling_price')?.touched && productForm.get('selling_price')?.invalid"
                  formControlName="selling_price"
                  min="0.01"
                  step="0.01"
                />
                <div *ngIf="productForm.get('selling_price')?.touched && productForm.get('selling_price')?.invalid" class="field-error">
                  ❌ Selling price must be greater than ₹0.
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">GST Percentage (%) *</label>
                <input
                  type="number"
                  class="form-control"
                  [class.is-invalid]="productForm.get('gst_percentage')?.touched && productForm.get('gst_percentage')?.invalid"
                  formControlName="gst_percentage"
                  min="0"
                  max="100"
                />
                <div *ngIf="productForm.get('gst_percentage')?.touched && productForm.get('gst_percentage')?.invalid" class="field-error">
                  ❌ GST % must be between 0 and 100.
                </div>
              </div>
              <div class="form-group col">
                <label class="form-label">Stock Quantity *</label>
                <input
                  type="number"
                  class="form-control"
                  [class.is-invalid]="productForm.get('stock_quantity')?.touched && productForm.get('stock_quantity')?.invalid"
                  formControlName="stock_quantity"
                  min="0"
                />
                <div *ngIf="productForm.get('stock_quantity')?.touched && productForm.get('stock_quantity')?.invalid" class="field-error">
                  ❌ Stock cannot be negative.
                </div>
              </div>
              <div class="form-group col">
                <label class="form-label">Low Stock Threshold *</label>
                <input
                  type="number"
                  class="form-control"
                  [class.is-invalid]="productForm.get('low_stock_threshold')?.touched && productForm.get('low_stock_threshold')?.invalid"
                  formControlName="low_stock_threshold"
                  min="0"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-control" formControlName="description" rows="2"></textarea>
            </div>

            <div *ngIf="modalError" class="alert alert-danger">{{ modalError }}</div>

            <button type="submit" class="btn btn-primary btn-block mt-3" [disabled]="productForm.invalid || isSaving || quickCodeConflict?.isDuplicate || skuConflict?.isDuplicate">
              {{ isSaving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; }
    .search-box { flex: 1; max-width: 400px; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .col { flex: 1; }
    .form-row .col-4 { width: 33.33%; }
    .form-row .col-8 { width: 66.66%; }
    .action-btn-group { display: flex; gap: 0.5rem; }
    .btn-block { width: 100%; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #4F46E5; }
    .quick-code-badge { background: #EEF2FF; color: #4F46E5; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.85rem; border: 1px solid #C7D2FE; }
    .checkbox-label { font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
    .alert-danger { background: #FEE2E2; color: #991B1B; padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; }
    .qc-feedback { margin-top: 0.4rem; font-size: 0.78rem; font-weight: 600; display: flex; flex-direction: column; gap: 0.35rem; }
    .qc-feedback.error { color: #DC2626; background: #FEF2F2; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #FCA5A5; }
    .qc-feedback.success { color: #16A34A; background: #F0FDF4; padding: 0.3rem 0.6rem; border-radius: 6px; border: 1px solid #BBF7D0; }
    .btn-use-suggested {
      align-self: flex-start; background: #4F46E5; color: white; border: none;
      padding: 0.25rem 0.6rem; border-radius: 5px; font-weight: 700; font-size: 0.75rem; cursor: pointer;
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2); transition: all 0.2s;
    }
    .btn-use-suggested:hover { background: #3730A3; transform: translateY(-1px); }
    .is-invalid { border-color: #DC2626 !important; }
    .field-error { color: #DC2626; font-size: 0.75rem; font-weight: 700; margin-top: 0.25rem; }
  `]
})
export class ProductsComponent implements OnInit {
  private apiService = inject(ApiService);
  private fb = inject(FormBuilder);

  products: Product[] = [];
  searchQuery = '';
  lowStockOnly = false;

  showModal = false;
  editingProduct: Product | null = null;
  isSaving = false;
  modalError = '';

  suggestedQuickCode = '';
  quickCodeConflict: { isDuplicate: boolean; existingProductName?: string } | null = null;
  skuConflict: { isDuplicate: boolean; existingProductName?: string } | null = null;

  productForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: ['', Validators.required],
    quick_code: [''],
    category: ['General', Validators.required],
    purchase_price: [0, [Validators.required, Validators.min(0)]],
    selling_price: [25, [Validators.required, Validators.min(0.01)]],
    gst_percentage: [5, [Validators.required, Validators.min(0), Validators.max(100)]],
    stock_quantity: [10, [Validators.required, Validators.min(0)]],
    low_stock_threshold: [5, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.apiService.getProducts(this.searchQuery, undefined, this.lowStockOnly).subscribe(data => {
      this.products = data;
      if (this.showModal) {
        this.checkQuickCodeAvailability();
        this.checkSkuAvailability();
      }
    });
  }

  loadNextQuickCode(prefill: boolean = false) {
    this.apiService.getNextQuickCode().subscribe({
      next: (res) => {
        this.suggestedQuickCode = res.next_quick_code;
        if (prefill && !this.editingProduct) {
          this.productForm.patchValue({ quick_code: res.next_quick_code });
          this.checkQuickCodeAvailability();
        }
      }
    });
  }

  checkQuickCodeAvailability() {
    const rawVal = this.productForm.value.quick_code;
    if (rawVal === null || rawVal === undefined || !rawVal.toString().trim()) {
      this.quickCodeConflict = null;
      return;
    }
    const val = rawVal.toString().trim().toLowerCase();
    const existing = this.products.find(p =>
      p.is_active &&
      p.quick_code !== null &&
      p.quick_code !== undefined &&
      String(p.quick_code).trim().toLowerCase() === val &&
      (!this.editingProduct || p.id !== this.editingProduct.id)
    );

    if (existing) {
      this.quickCodeConflict = { isDuplicate: true, existingProductName: existing.name };
      if (!this.suggestedQuickCode || String(this.suggestedQuickCode).toLowerCase() === val) {
        this.loadNextQuickCode(false);
      }
    } else {
      this.quickCodeConflict = { isDuplicate: false };
    }
  }

  checkSkuAvailability() {
    const rawVal = this.productForm.value.sku;
    if (rawVal === null || rawVal === undefined || !rawVal.toString().trim()) {
      this.skuConflict = null;
      return;
    }
    const val = rawVal.toString().trim().toLowerCase();
    const existing = this.products.find(p =>
      p.is_active &&
      p.sku &&
      String(p.sku).trim().toLowerCase() === val &&
      (!this.editingProduct || p.id !== this.editingProduct.id)
    );

    if (existing) {
      this.skuConflict = { isDuplicate: true, existingProductName: existing.name };
    } else {
      this.skuConflict = { isDuplicate: false };
    }
  }

  useSuggestedQuickCode() {
    if (!this.suggestedQuickCode) return;
    this.productForm.patchValue({ quick_code: this.suggestedQuickCode });
    this.checkQuickCodeAvailability();
  }

  openAddModal() {
    this.editingProduct = null;
    this.modalError = '';
    this.quickCodeConflict = null;
    this.skuConflict = null;
    this.productForm.reset({
      name: '', sku: '', quick_code: '', category: 'General', purchase_price: 0,
      selling_price: 0, gst_percentage: 18, stock_quantity: 10, low_stock_threshold: 5, description: ''
    });
    this.showModal = true;
    this.loadProducts();
    this.loadNextQuickCode(true);
  }

  openEditModal(p: Product) {
    this.editingProduct = p;
    this.modalError = '';
    this.quickCodeConflict = null;
    this.skuConflict = null;
    this.productForm.patchValue({
      name: p.name, sku: p.sku, quick_code: p.quick_code || '', category: p.category, purchase_price: p.purchase_price,
      selling_price: p.selling_price, gst_percentage: p.gst_percentage,
      stock_quantity: p.stock_quantity, low_stock_threshold: p.low_stock_threshold, description: p.description || ''
    });
    this.showModal = true;
    this.loadProducts();
    this.loadNextQuickCode(false);
    this.checkQuickCodeAvailability();
    this.checkSkuAvailability();
  }

  closeModal() { this.showModal = false; }

  extractErrorMessage(err: any): string {
    if (!err) return 'An unexpected error occurred.';
    const body = err.error;
    if (body) {
      if (typeof body.detail === 'string') return body.detail;
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        return body.detail.map((d: any) => d.msg || d.detail || JSON.stringify(d)).join(', ');
      }
      if (typeof body === 'string') return body;
      if (body.message) return body.message;
    }
    return err.message || 'Failed to complete request.';
  }

  onSubmit() {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid) {
      this.modalError = 'Please fix the validation errors marked in red above.';
      return;
    }
    if (this.quickCodeConflict?.isDuplicate) {
      this.modalError = `Quick Code '#${this.productForm.value.quick_code}' is already assigned to '${this.quickCodeConflict.existingProductName}'. Please use available code ${this.suggestedQuickCode}.`;
      return;
    }
    if (this.skuConflict?.isDuplicate) {
      this.modalError = `SKU '${this.productForm.value.sku}' is already assigned to '${this.skuConflict.existingProductName}'.`;
      return;
    }
    this.isSaving = true;
    this.modalError = '';

    const payload = this.productForm.value;
    if (this.editingProduct) {
      this.apiService.updateProduct(this.editingProduct.id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.showModal = false;
          this.loadProducts();
        },
        error: (err) => {
          this.isSaving = false;
          this.modalError = this.extractErrorMessage(err);
          this.loadNextQuickCode(false);
        }
      });
    } else {
      this.apiService.createProduct(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.showModal = false;
          this.loadProducts();
        },
        error: (err) => {
          this.isSaving = false;
          this.modalError = this.extractErrorMessage(err);
          this.loadNextQuickCode(false);
        }
      });
    }
  }

  deleteProduct(p: Product) {
    if (confirm(`Deactivate product "${p.name}"?`)) {
      this.apiService.deleteProduct(p.id).subscribe(() => this.loadProducts());
    }
  }
}
