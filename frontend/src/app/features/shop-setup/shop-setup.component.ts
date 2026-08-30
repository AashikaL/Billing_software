import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shop-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="setup-wrapper">
      <div class="setup-card card">
        <div class="setup-header">
          <h2>🏢 Shop Profile Onboarding</h2>
          <p>Provide your shop details for automated PDF invoice generation.</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

        <form [formGroup]="setupForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Shop / Business Name *</label>
            <input type="text" class="form-control" formControlName="shop_name" placeholder="Sri Lakshmi Stores" />
          </div>

          <div class="form-row">
            <div class="form-group col">
              <label class="form-label">Address</label>
              <input type="text" class="form-control" formControlName="address" placeholder="104 M.G. Road" />
            </div>
            <div class="form-group col">
              <label class="form-label">City</label>
              <input type="text" class="form-control" formControlName="city" placeholder="Bengaluru" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col">
              <label class="form-label">State</label>
              <input type="text" class="form-control" formControlName="state" placeholder="Karnataka" />
            </div>
            <div class="form-group col">
              <label class="form-label">Pincode</label>
              <input type="text" class="form-control" formControlName="pincode" placeholder="560001" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col">
              <label class="form-label">GSTIN (Optional)</label>
              <input type="text" class="form-control" formControlName="gstin" placeholder="29ABCDE1234F1Z5" />
            </div>
            <div class="form-group col">
              <label class="form-label">Invoice Prefix</label>
              <input type="text" class="form-control" formControlName="invoice_prefix" placeholder="INV" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="setupForm.invalid || isLoading">
            {{ isLoading ? 'Saving Setup...' : 'Complete Setup & Go to Dashboard' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .setup-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F1F5F9;
      padding: 2rem;
    }
    .setup-card {
      width: 100%;
      max-width: 620px;
      padding: 2.5rem;
    }
    .setup-header h2 { font-size: 1.5rem; font-weight: 800; }
    .setup-header p { color: #64748B; margin-bottom: 1.5rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .col { flex: 1; }
    .btn-block { width: 100%; margin-top: 1rem; padding: 0.75rem; }
    .alert-danger { background: #FEE2E2; color: #991B1B; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; }
  `]
})
export class ShopSetupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';

  setupForm = this.fb.group({
    shop_name: ['', [Validators.required, Validators.minLength(2)]],
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
        this.setupForm.patchValue({
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
    if (this.setupForm.invalid) return;
    this.isLoading = true;

    this.authService.setupShop(this.setupForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Failed to save shop profile.';
      }
    });
  }
}
