import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Shop } from '../../core/models/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings & Shop Profile</h1>
          <p class="page-subtitle">Update shop name, address, GSTIN, and automated invoice preferences</p>
        </div>
      </div>

      <div class="card settings-card">
        <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>
        <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

        <form [formGroup]="shopForm" (ngSubmit)="onSubmit()">
          <h3 class="section-title">🏢 Shop Information</h3>

          <div class="form-group">
            <label class="form-label">Shop Name *</label>
            <input type="text" class="form-control" formControlName="shop_name" />
          </div>

          <div class="form-row">
            <div class="form-group col">
              <label class="form-label">Address</label>
              <input type="text" class="form-control" formControlName="address" />
            </div>
            <div class="form-group col">
              <label class="form-label">City</label>
              <input type="text" class="form-control" formControlName="city" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col">
              <label class="form-label">State</label>
              <input type="text" class="form-control" formControlName="state" />
            </div>
            <div class="form-group col">
              <label class="form-label">Pincode</label>
              <input type="text" class="form-control" formControlName="pincode" />
            </div>
          </div>

          <hr class="my-4" />

          <h3 class="section-title">📄 Invoice Configuration</h3>

          <div class="form-row">
            <div class="form-group col">
              <label class="form-label">GSTIN (GST Identification Number)</label>
              <input type="text" class="form-control" formControlName="gstin" placeholder="29ABCDE1234F1Z5" />
            </div>
            <div class="form-group col">
              <label class="form-label">Invoice Prefix (e.g. INV, SLE)</label>
              <input type="text" class="form-control" formControlName="invoice_prefix" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary mt-3" [disabled]="shopForm.invalid || isSaving">
            {{ isSaving ? 'Saving Changes...' : 'Save Settings' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .settings-card { max-width: 750px; }
    .section-title { font-size: 1.1rem; font-weight: 800; color: #0F172A; margin-bottom: 1rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .col { flex: 1; }
    .my-4 { margin: 1.5rem 0; border: none; border-top: 1px solid #E2E8F0; }
    .alert-success { background: #DCFCE7; color: #15803D; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-weight: 600; }
    .alert-danger { background: #FEE2E2; color: #991B1B; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-weight: 600; }
  `]
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  isSaving = false;
  successMessage = '';
  errorMessage = '';

  shopForm = this.fb.group({
    shop_name: ['', Validators.required],
    address: [''],
    city: [''],
    state: [''],
    pincode: [''],
    gstin: [''],
    invoice_prefix: ['INV']
  });

  ngOnInit() {
    this.authService.currentShop$.subscribe(shop => {
      if (shop) {
        this.shopForm.patchValue({
          shop_name: shop.shop_name,
          address: shop.address || '',
          city: shop.city || '',
          state: shop.state || '',
          pincode: shop.pincode || '',
          gstin: shop.gstin || '',
          invoice_prefix: shop.invoice_prefix || 'INV'
        });
      }
    });
  }

  onSubmit() {
    if (this.shopForm.invalid) return;
    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.authService.setupShop(this.shopForm.value).subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Shop settings saved successfully!';
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.detail || 'Failed to update settings.';
      }
    });
  }
}
