import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { ShopSetupComponent } from './features/shop-setup/shop-setup.component';
import { MainLayoutComponent } from './shared/layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { BillingComponent } from './features/billing/billing.component';
import { ProductsComponent } from './features/products/products.component';
import { CustomersComponent } from './features/customers/customers.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { InvoicesComponent } from './features/invoices/invoices.component';
import { ReportsComponent } from './features/reports/reports.component';
import { AiAssistantComponent } from './features/ai-assistant/ai-assistant.component';
import { SettingsComponent } from './features/settings/settings.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'setup', component: ShopSetupComponent, canActivate: [authGuard] },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'billing', component: BillingComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'customers', component: CustomersComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'invoices', component: InvoicesComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'ai-assistant', component: AiAssistantComponent },
      { path: 'settings', component: SettingsComponent },
      { path: '**', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: '' }
];
