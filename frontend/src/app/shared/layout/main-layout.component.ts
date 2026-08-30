import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Shop, User } from '../../core/models/models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-container" [class.sidebar-collapsed]="isCollapsed">
      <!-- Mobile Overlay Backdrop -->
      <div class="sidebar-backdrop" *ngIf="isMobileOpen" (click)="toggleMobile()"></div>

      <!-- Sidebar Navigation -->
      <aside class="sidebar" [class.mobile-open]="isMobileOpen">
        <div class="sidebar-brand">
          <div class="brand-logo" (click)="toggleCollapse()" title="Toggle Sidebar Menu">⚡</div>
          <div class="brand-text" *ngIf="!isCollapsed">
            <h2>{{ currentShop?.shop_name || 'Billing SaaS' }}</h2>
            <span class="shop-badge">Multi-Tenant SaaS</span>
          </div>
          <button class="collapse-toggle-btn desktop-only" (click)="toggleCollapse()" [title]="isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'">
            {{ isCollapsed ? '▶' : '◀' }}
          </button>
        </div>

        <nav class="sidebar-nav">
          <a [routerLink]="['/dashboard']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item" [title]="isCollapsed ? 'Dashboard' : ''">
            <span class="nav-icon">📊</span>
            <span class="nav-text" *ngIf="!isCollapsed">Dashboard</span>
          </a>
          <a [routerLink]="['/billing']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item highlight-nav" [title]="isCollapsed ? 'Create Bill / POS' : ''">
            <span class="nav-icon">💳</span>
            <span class="nav-text" *ngIf="!isCollapsed">Create Bill / POS</span>
          </a>
          <a [routerLink]="['/products']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item" [title]="isCollapsed ? 'Products' : ''">
            <span class="nav-icon">📦</span>
            <span class="nav-text" *ngIf="!isCollapsed">Products</span>
          </a>
          <a [routerLink]="['/customers']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item" [title]="isCollapsed ? 'Customers' : ''">
            <span class="nav-icon">👥</span>
            <span class="nav-text" *ngIf="!isCollapsed">Customers</span>
          </a>
          <a [routerLink]="['/inventory']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item" [title]="isCollapsed ? 'Inventory' : ''">
            <span class="nav-icon">🏬</span>
            <span class="nav-text" *ngIf="!isCollapsed">Inventory</span>
          </a>
          <a [routerLink]="['/invoices']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item" [title]="isCollapsed ? 'Bill History' : ''">
            <span class="nav-icon">📄</span>
            <span class="nav-text" *ngIf="!isCollapsed">Bill History</span>
          </a>
          <a [routerLink]="['/reports']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item" [title]="isCollapsed ? 'Financial Reports' : ''">
            <span class="nav-icon">📈</span>
            <span class="nav-text" *ngIf="!isCollapsed">Financial Reports</span>
          </a>
          <a [routerLink]="['/ai-assistant']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item ai-nav" [title]="isCollapsed ? 'AI Assistant' : ''">
            <span class="nav-icon">🤖</span>
            <span class="nav-text" *ngIf="!isCollapsed">AI Assistant</span>
            <span class="ai-badge" *ngIf="!isCollapsed">AI</span>
          </a>
          <a [routerLink]="['/settings']" (click)="closeMobileOnNav()" routerLinkActive="active" class="nav-item" [title]="isCollapsed ? 'Settings' : ''">
            <span class="nav-icon">⚙️</span>
            <span class="nav-text" *ngIf="!isCollapsed">Settings</span>
          </a>
        </nav>

        <div class="sidebar-user">
          <div class="user-avatar" [title]="currentUser?.name || ''">{{ userInitials }}</div>
          <div class="user-info" *ngIf="!isCollapsed">
            <span class="user-name">{{ currentUser?.name }}</span>
            <span class="user-email">{{ currentUser?.email }}</span>
          </div>
          <button class="btn-logout" (click)="onLogout()" title="Logout">🚪</button>
        </div>
      </aside>

      <!-- Main Layout Body -->
      <div class="main-content">
        <header class="top-header">
          <div class="header-left">
            <button class="mobile-toggle" (click)="toggleMobile()">☰</button>
            <button class="sidebar-toggle-top desktop-only" (click)="toggleCollapse()" [title]="isCollapsed ? 'Expand Sidebar Menu' : 'Collapse Sidebar Menu'">
              <span class="toggle-icon">☰</span>
              <span class="toggle-label">{{ isCollapsed ? 'Expand Menu' : 'Collapse Menu' }}</span>
            </button>
            <div class="header-shop-info">
              <span class="shop-title">🏪 {{ currentShop?.shop_name || 'My Shop' }}</span>
              <span class="gst-badge desktop-only" *ngIf="currentShop?.gstin">GSTIN: {{ currentShop?.gstin }}</span>
            </div>
          </div>
          <div class="header-actions">
            <a [routerLink]="['/ai-assistant']" class="btn btn-secondary btn-sm ai-btn">
              🤖 <span class="action-text">Ask AI</span>
            </a>
            <a [routerLink]="['/billing']" class="btn btn-primary btn-sm">
              + <span class="action-text">New Bill</span>
            </a>
          </div>
        </header>

        <main class="page-container">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
      background: var(--bg-color);
      position: relative;
    }
    .sidebar-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      z-index: 99;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .sidebar {
      width: 260px;
      background: var(--sidebar-bg);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
      border-right: 1px solid #1E293B;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .app-container.sidebar-collapsed .sidebar {
      width: 72px;
    }
    .sidebar-brand {
      padding: 1.25rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid #1E293B;
      position: relative;
    }
    .app-container.sidebar-collapsed .sidebar-brand {
      justify-content: center;
      padding: 1.25rem 0.5rem;
    }
    .brand-logo {
      width: 40px;
      height: 40px;
      background: #4F46E5;
      color: white;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 800;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.2s;
    }
    .brand-logo:hover {
      transform: scale(1.05);
    }
    .brand-text h2 {
      color: white;
      font-size: 0.95rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
    }
    .shop-badge {
      font-size: 0.65rem;
      background: #312E81;
      color: #A5B4FC;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
    }
    .collapse-toggle-btn {
      margin-left: auto;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94A3B8;
      border-radius: 6px;
      padding: 0.25rem 0.45rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .collapse-toggle-btn:hover {
      background: #4F46E5;
      color: white;
    }
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.85rem;
      color: var(--sidebar-text);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 8px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .app-container.sidebar-collapsed .nav-item {
      justify-content: center;
      padding: 0.75rem 0;
    }
    .nav-icon {
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .nav-item:hover {
      background: var(--sidebar-hover);
      color: var(--sidebar-text-active);
    }
    .nav-item.active {
      background: var(--sidebar-active);
      color: #FFFFFF;
    }
    .highlight-nav {
      background: rgba(79, 70, 229, 0.15);
      color: #818CF8;
      border: 1px dashed rgba(99, 102, 241, 0.4);
    }
    .highlight-nav:hover {
      background: #4F46E5;
      color: white;
    }
    .ai-nav {
      position: relative;
    }
    .ai-badge {
      margin-left: auto;
      background: linear-gradient(135deg, #EC4899, #8B5CF6);
      color: white;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.1rem 0.4rem;
      border-radius: 99px;
    }
    .sidebar-user {
      padding: 1rem;
      border-top: 1px solid #1E293B;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #090D16;
    }
    .app-container.sidebar-collapsed .sidebar-user {
      justify-content: center;
      padding: 0.85rem 0.5rem;
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #4338CA;
      color: white;
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-info {
      flex: 1;
      min-width: 0;
    }
    .user-name {
      display: block;
      color: white;
      font-size: 0.85rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-email {
      display: block;
      color: #64748B;
      font-size: 0.75rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-logout {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.25rem;
      flex-shrink: 0;
    }
    .top-header {
      height: 64px;
      background: white;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 90;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .sidebar-toggle-top {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .sidebar-toggle-top:hover {
      background: #EEF2FF;
      border-color: #6366F1;
      color: #4F46E5;
    }
    .toggle-icon {
      font-size: 1rem;
    }
    .mobile-toggle {
      display: none;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      font-size: 1.2rem;
      padding: 0.35rem 0.65rem;
      border-radius: 8px;
      cursor: pointer;
    }
    .header-shop-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .shop-title {
      font-weight: 800;
      font-size: 1.05rem;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }
    .gst-badge {
      background: #EEF2FF;
      color: #4F46E5;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .ai-btn {
      background: #F4F4F5;
      color: #4F46E5;
      font-weight: 700;
    }

    @media (max-width: 900px) {
      .desktop-only { display: none !important; }
      .mobile-toggle { display: block; }
      .top-header { padding: 0 0.85rem; height: 56px; }
      .shop-title { font-size: 0.9rem; max-width: 140px; }
      .action-text { display: none; }
      .sidebar {
        position: fixed;
        left: -260px;
        transition: left 0.3s ease;
      }
      .sidebar.mobile-open { left: 0; }
      .app-container.sidebar-collapsed .sidebar { width: 260px; }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser: User | null = null;
  currentShop: Shop | null = null;
  isMobileOpen = false;
  isCollapsed = false;

  get userInitials(): string {
    if (!this.currentUser?.name) return 'U';
    const parts = this.currentUser.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);
    this.authService.currentShop$.subscribe(s => this.currentShop = s);
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleMobile() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobileOnNav() {
    if (this.isMobileOpen) {
      this.isMobileOpen = false;
    }
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

