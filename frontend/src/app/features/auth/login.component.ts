import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="auth-brand">
            <span class="brand-icon">⚡</span>
            <h2>Billing & Inventory SaaS</h2>
          </div>
          <p class="auth-subtitle">Sign in to your shop owner dashboard</p>
        </div>

        <div *ngIf="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input 
              type="email" 
              class="form-control" 
              formControlName="email" 
              placeholder="owner@example.com"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input 
              type="password" 
              class="form-control" 
              formControlName="password" 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loginForm.invalid || isLoading">
            {{ isLoading ? 'Signing In...' : 'Sign In' }}
          </button>
        </form>

        <div class="demo-box">
          <p class="demo-title">⚡ Testing Quick-Fill Demo Account:</p>
          <button type="button" class="btn btn-secondary btn-sm" (click)="fillDemoCredentials()">
            Fill Demo (demo@shop.com)
          </button>
        </div>

        <div class="auth-footer">
          Don't have a shop account? <a routerLink="/register">Register your shop</a>
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
      max-width: 440px;
      padding: 2.25rem;
      border-radius: 16px;
    }
    .auth-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .brand-icon {
      font-size: 1.8rem;
    }
    .auth-brand h2 {
      font-size: 1.35rem;
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
    .demo-box {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #F8FAFC;
      border-radius: 10px;
      border: 1px dashed #CBD5E1;
      text-align: center;
    }
    .demo-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      margin-bottom: 0.5rem;
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
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  fillDemoCredentials() {
    this.loginForm.patchValue({
      email: 'demo@shop.com',
      password: 'password123'
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.has_shop) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/setup']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Login failed. Please verify credentials.';
      }
    });
  }
}
