import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card card">
        <div class="auth-header">
          <h2>Create Shop Account</h2>
          <p class="auth-subtitle">Get started with multi-tenant Billing SaaS</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <form [formGroup]="regForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Owner Name *</label>
            <input type="text" class="form-control" formControlName="name" placeholder="Full Name" />
          </div>

          <div class="form-group">
            <label class="form-label">Shop Name *</label>
            <input type="text" class="form-control" formControlName="shop_name" placeholder="e.g. Aashika Fashion Store" />
          </div>

          <div class="form-group">
            <label class="form-label">Email Address *</label>
            <input type="email" class="form-control" formControlName="email" placeholder="owner@store.com" />
          </div>

          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="text" class="form-control" formControlName="phone" placeholder="+91 98765 43210" />
          </div>

          <div class="form-group">
            <label class="form-label">Password *</label>
            <input type="password" class="form-control" formControlName="password" placeholder="At least 6 characters" />
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="regForm.invalid || isLoading">
            {{ isLoading ? 'Creating Account...' : 'Register & Start Billing' }}
          </button>
        </form>

        <div class="auth-footer">
          Already registered? <a routerLink="/login">Sign in</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%);
      padding: 1.5rem;
    }
    .auth-card {
      width: 100%;
      max-width: 480px;
      padding: 2.25rem;
      border-radius: 16px;
    }
    .auth-header h2 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #0F172A;
    }
    .auth-subtitle {
      font-size: 0.875rem;
      color: #64748B;
      margin-bottom: 1.5rem;
    }
    .btn-block {
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.75rem;
    }
    .alert-danger {
      background: #FEE2E2;
      color: #991B1B;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      font-weight: 600;
    }
    .auth-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #64748B;
    }
    .auth-footer a {
      color: #4F46E5;
      font-weight: 700;
      text-decoration: none;
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';

  regForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    shop_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.regForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.regForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Registration failed. Email might already exist.';
      }
    });
  }
}
