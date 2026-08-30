import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Customer } from '../../core/models/models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="customers-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Customer Directory</h1>
          <p class="page-subtitle">Track customer purchase history and total amount spent</p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">+ Add Customer</button>
      </div>

      <!-- Toolbar -->
      <div class="toolbar card">
        <input
          type="text"
          class="form-control search-input"
          placeholder="Search customer by Name, Phone, or Email..."
          [(ngModel)]="searchQuery"
          (ngModelChange)="loadCustomers()"
        />
      </div>

      <!-- Customer Directory Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Address</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Registered Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of customers">
                <td class="font-bold">{{ c.name }}</td>
                <td>{{ c.phone || '-' }}</td>
                <td>{{ c.email || '-' }}</td>
                <td class="text-muted">{{ c.address || '-' }}</td>
                <td><span class="badge badge-info">{{ c.total_orders || 0 }} orders</span></td>
                <td class="font-bold text-success">₹{{ c.total_spent | number:'1.2-2' }}</td>
                <td class="text-muted">{{ c.created_at | date:'mediumDate' }}</td>
                <td>
                  <div class="action-btn-group">
                    <button class="btn btn-secondary btn-sm" (click)="openEditModal(c)">Edit</button>
                    <button class="btn btn-danger btn-sm" (click)="deleteCustomer(c)">Delete</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="customers.length === 0">
                <td colspan="8" class="text-center py-4">
                  No customers found. Click "+ Add Customer" to create customer profiles.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Customer Modal -->
      <div *ngIf="showModal" class="modal-backdrop" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ editingCustomer ? 'Edit Customer' : 'Add New Customer' }}</h3>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>

          <form [formGroup]="custForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="Ananya Sharma" />
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">Phone Number</label>
                <input type="text" class="form-control" formControlName="phone" placeholder="9812345678" />
              </div>
              <div class="form-group col">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-control" formControlName="email" placeholder="customer@example.com" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Address</label>
              <textarea class="form-control" formControlName="address" rows="2" placeholder="Street, City"></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-block mt-3" [disabled]="custForm.invalid || isSaving">
              {{ isSaving ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Save Customer') }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toolbar { margin-bottom: 1.5rem; }
    .search-input { max-width: 450px; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .col { flex: 1; }
    .action-btn-group { display: flex; gap: 0.5rem; }
    .font-bold { font-weight: 700; }
    .text-success { color: #10B981; }
    .text-muted { color: #64748B; }
    .btn-block { width: 100%; }
  `]
})
export class CustomersComponent implements OnInit {
  private apiService = inject(ApiService);
  private fb = inject(FormBuilder);

  customers: Customer[] = [];
  searchQuery = '';

  showModal = false;
  editingCustomer: Customer | null = null;
  isSaving = false;

  custForm = this.fb.group({
    name: ['', Validators.required],
    phone: [''],
    email: [''],
    address: ['']
  });

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.apiService.getCustomers(this.searchQuery).subscribe(data => this.customers = data);
  }

  openAddModal() {
    this.editingCustomer = null;
    this.custForm.reset();
    this.showModal = true;
  }

  openEditModal(c: Customer) {
    this.editingCustomer = c;
    this.custForm.patchValue({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || ''
    });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  onSubmit() {
    if (this.custForm.invalid) return;
    this.isSaving = true;

    const payload = this.custForm.value;
    if (this.editingCustomer) {
      this.apiService.updateCustomer(this.editingCustomer.id, payload).subscribe(() => {
        this.isSaving = false;
        this.showModal = false;
        this.loadCustomers();
      });
    } else {
      this.apiService.createCustomer(payload).subscribe(() => {
        this.isSaving = false;
        this.showModal = false;
        this.loadCustomers();
      });
    }
  }

  deleteCustomer(c: Customer) {
    if (confirm(`Delete customer "${c.name}"?`)) {
      this.apiService.deleteCustomer(c.id).subscribe(() => this.loadCustomers());
    }
  }
}
