import { Component, inject, OnInit, ViewChild, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, Customer, Invoice, Shop } from '../../core/models/models';

interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="billing-page">
      <!-- Compact Header & Hotkeys Bar -->
      <div class="top-billing-bar">
        <div class="billing-title-compact">
          <h1 class="page-title">⚡ Express POS</h1>
          <span class="pos-status-badge">Live</span>
        </div>

        <!-- Ultra-Thin Inline Hotkey Strip -->
        <div class="hotkey-banner-compact" *ngIf="showHotkeys">
          <span class="hotkey-label">⚡ KEYS:</span>
          <span class="hotkey-chip"><kbd>Enter</kbd> Add Item</span>
          <span class="hotkey-chip clear-chip"><kbd>Alt+C</kbd> Clear Cart 🗑️</span>
          <span class="hotkey-chip print-chip"><kbd>End</kbd> / <kbd>Ctrl+Enter</kbd> Print 🖨️</span>
          <span class="hotkey-chip"><kbd>F2</kbd> Focus</span>
          <span class="hotkey-chip"><kbd>F4</kbd> Pay ({{ paymentMethod }})</span>
          <span class="hotkey-chip"><kbd>Esc</kbd> Reset</span>
        </div>

        <button class="btn-toggle-hotkeys" (click)="showHotkeys = !showHotkeys" [title]="showHotkeys ? 'Hide Hotkey Shortcuts Bar' : 'Show Hotkey Shortcuts Bar'">
          ⌨️ {{ showHotkeys ? 'Hide Keys' : 'Keys' }}
        </button>
      </div>

      <!-- Quick Code Lightning Entry Box -->
      <div class="quick-code-bar card">
        <div class="quick-code-wrapper">
          <span class="quick-icon">⚡</span>
          <input
            #quickInput
            type="text"
            class="form-control quick-code-input"
            placeholder="Type Quick Code (e.g. 1) OR Item Name ('tea', 'coffee') & press Enter..."
            [(ngModel)]="quickCodeInput"
            (keydown.enter)="onQuickCodeSubmit($event)"
            autocomplete="off"
          />
          <button class="btn btn-primary btn-add-code" (click)="onQuickCodeSubmit()">+ Add Code</button>
        </div>
        <div *ngIf="quickCodeFeedback" class="quick-feedback" [class.error]="quickCodeFeedbackIsError">
          {{ quickCodeFeedback }}
        </div>
      </div>

      <div class="billing-grid">
        <!-- Left Column: Product Selection Grid & Search -->
        <div class="products-section">
          <div class="search-bar card">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="form-control"
                placeholder="Search products by Name or SKU..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
              />
            </div>
            <div class="category-pills">
              <button
                class="pill"
                [class.active]="selectedCategory === ''"
                (click)="selectCategory('')"
              >All Items</button>
              <button
                *ngFor="let cat of categories"
                class="pill"
                [class.active]="selectedCategory === cat"
                (click)="selectCategory(cat)"
              >{{ cat }}</button>
            </div>
          </div>

          <!-- Product Cards Grid -->
          <div class="product-cards-grid">
            <div
              *ngFor="let p of filteredProducts"
              class="product-item-card card"
              [class.out-of-stock]="p.stock_quantity <= 0"
              (click)="addToCart(p)"
            >
              <div class="card-top-badges">
                <span class="quick-code-chip" *ngIf="p.quick_code">#{{ p.quick_code }}</span>
                <span class="prod-badge" *ngIf="p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0">
                  Low Stock ({{ p.stock_quantity }})
                </span>
                <span class="prod-badge danger" *ngIf="p.stock_quantity <= 0">Out of Stock</span>
              </div>
              <div class="prod-name">{{ p.name }}</div>
              <div class="prod-sku">SKU: {{ p.sku }}</div>
              <div class="prod-footer">
                <span class="prod-price">₹{{ p.selling_price | number:'1.2-2' }}</span>
                <span class="prod-gst">+{{ p.gst_percentage }}% GST</span>
              </div>
              <div class="stock-info">Available Stock: <strong>{{ p.stock_quantity }}</strong></div>
            </div>
          </div>

          <div *ngIf="filteredProducts.length === 0" class="empty-state card">
            <div class="empty-icon">📦</div>
            <div class="empty-title">No products found</div>
            <div class="empty-desc">Try clearing filters or search criteria.</div>
          </div>
        </div>

        <!-- Right Column: Cart & Invoice Checkout Panel -->
        <div class="checkout-panel card">
          <div class="cart-header-row">
            <h3 class="panel-title">🛒 Current Order Cart</h3>
            <button
              class="btn-clear-cart"
              *ngIf="cart.length > 0"
              (click)="clearCart()"
              title="Clear all cart items (Alt + C / Shift + Delete)"
            >
              🗑️ Clear All <kbd class="hotkey-kbd">Alt+C</kbd>
            </button>
          </div>

          <!-- Customer Selection -->
          <div class="customer-box">
            <label class="form-label">Customer Details</label>
            <div class="cust-select-group">
              <select class="form-control" [(ngModel)]="selectedCustomerId">
                <option [ngValue]="null">Walk-in Customer</option>
                <option *ngFor="let c of customers" [value]="c.id">
                  {{ c.name }} ({{ c.phone || 'No phone' }})
                </option>
              </select>
              <button class="btn btn-secondary btn-sm" (click)="showNewCustomerModal = true">+</button>
            </div>
          </div>

          <!-- Cart Items Table -->
          <div class="cart-items-wrapper">
            <table class="cart-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of cart; let i = index">
                  <td class="cart-prod-name">
                    <div>
                      <span class="code-tag" *ngIf="item.product.quick_code">#{{ item.product.quick_code }}</span>
                      <strong>{{ item.product.name }}</strong>
                    </div>
                    <small class="text-muted">{{ item.product.gst_percentage }}% GST</small>
                  </td>
                  <td>
                    <div class="qty-control">
                      <button (click)="updateQuantity(i, -1)">-</button>
                      <span>{{ item.quantity }}</span>
                      <button (click)="updateQuantity(i, 1)">+</button>
                    </div>
                  </td>
                  <td>₹{{ item.product.selling_price }}</td>
                  <td class="font-bold">₹{{ getItemTotal(item) | number:'1.2-2' }}</td>
                  <td>
                    <button class="btn-remove" (click)="removeFromCart(i)">🗑️</button>
                  </td>
                </tr>
                <tr *ngIf="cart.length === 0">
                  <td colspan="5" class="empty-cart-msg">
                    Cart is empty. Type Quick Code above (e.g. 1) & press Enter!
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Checkout Calculation Summary -->
          <div class="calculation-summary">
            <div class="calc-row">
              <span>Items Subtotal:</span>
              <span>₹{{ subtotal | number:'1.2-2' }}</span>
            </div>
            <div class="calc-row">
              <span>GST Tax Amount:</span>
              <span>₹{{ totalGst | number:'1.2-2' }}</span>
            </div>
            <div class="calc-row">
              <span>Discount (₹):</span>
              <input
                type="number"
                class="form-control discount-input"
                [(ngModel)]="discount"
                min="0"
              />
            </div>
            <div class="calc-row grand-total-row">
              <span>Grand Total:</span>
              <span class="grand-price">₹{{ grandTotal | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- Payment Method Selection -->
          <div class="payment-methods">
            <label class="form-label">Payment Method <small class="text-muted">(F4 to toggle)</small></label>
            <div class="method-btns">
              <button
                class="method-btn"
                [class.active]="paymentMethod === 'Cash'"
                (click)="paymentMethod = 'Cash'"
              >💵 Cash</button>
              <button
                class="method-btn"
                [class.active]="paymentMethod === 'UPI'"
                (click)="paymentMethod = 'UPI'"
              >📱 UPI</button>
              <button
                class="method-btn"
                [class.active]="paymentMethod === 'Card'"
                (click)="paymentMethod = 'Card'"
              >💳 Card</button>
            </div>
          </div>

          <div *ngIf="errorMessage" class="alert alert-danger mt-3">
            {{ errorMessage }}
          </div>

          <!-- Checkout Submit Button -->
          <button
            class="btn btn-primary btn-block checkout-btn"
            [disabled]="cart.length === 0 || isProcessing"
            (click)="processCheckout()"
          >
            {{ isProcessing ? 'Generating Bill...' : '🖨️ Complete Sale & Print Bill (Press END)' }}
          </button>
        </div>
      </div>

      <!-- Quick Add New Customer Modal -->
      <div *ngIf="showNewCustomerModal" class="modal-backdrop" (click)="showNewCustomerModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Add New Customer</h3>
            <button class="btn-close" (click)="showNewCustomerModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Customer Name *</label>
              <input type="text" class="form-control" [(ngModel)]="newCustName" placeholder="Full Name" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" class="form-control" [(ngModel)]="newCustPhone" placeholder="Mobile Number" />
            </div>
            <button class="btn btn-primary btn-block" (click)="saveNewCustomer()">Save & Select</button>
          </div>
        </div>
      </div>

      <!-- Professional Printable Invoice Modal -->
      <div *ngIf="generatedInvoice" class="modal-backdrop">
        <div class="modal-content invoice-modal-content" (click)="$event.stopPropagation()">
          <div class="no-print invoice-modal-actions">
            <button class="btn btn-primary" (click)="printInvoice()">🖨️ Print Receipt Paper Now</button>
            <button class="btn btn-secondary" (click)="closeInvoiceModal()">Close & New Bill (Esc)</button>
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
                <p><strong>Invoice No:</strong> {{ generatedInvoice.invoice_number }}</p>
                <p><strong>Date:</strong> {{ generatedInvoice.created_at | date:'medium' }}</p>
                <p><strong>Payment:</strong> {{ generatedInvoice.payment_method }}</p>
              </div>
            </div>

            <hr class="inv-divider" />

            <div class="cust-details">
              <p><strong>Billed To:</strong> {{ generatedInvoice.customer_name }}</p>
              <p *ngIf="generatedInvoice.customer_phone"><strong>Phone:</strong> {{ generatedInvoice.customer_phone }}</p>
            </div>

            <table class="inv-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item / Description</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>GST %</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of generatedInvoice.items; let idx = index">
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
                <div class="sum-row"><span>Subtotal:</span> <span>₹{{ generatedInvoice.subtotal | number:'1.2-2' }}</span></div>
                <div class="sum-row"><span>GST Tax Total:</span> <span>₹{{ generatedInvoice.gst_amount | number:'1.2-2' }}</span></div>
                <div class="sum-row" *ngIf="generatedInvoice.discount > 0"><span>Discount:</span> <span>-₹{{ generatedInvoice.discount | number:'1.2-2' }}</span></div>
                <div class="sum-row total"><span>Grand Total:</span> <span>₹{{ generatedInvoice.total_amount | number:'1.2-2' }}</span></div>
              </div>
            </div>

            <div class="inv-footer">
              <p>Thank you for visiting {{ currentShop?.shop_name }}!</p>
              <p class="sub">This is a computer-generated tax invoice receipt.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .billing-page { display: flex; flex-direction: column; gap: 0.75rem; }

    .top-billing-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      background: white;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }
    .billing-title-compact {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .billing-title-compact .page-title {
      font-size: 1.15rem;
      margin: 0;
    }
    .pos-status-badge {
      background: #DCFCE7;
      color: #15803D;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 99px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .top-billing-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
      background: white;
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      margin-bottom: 0.65rem;
    }
    .hotkey-banner-compact {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #0F172A;
      color: white;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      flex: 1;
      justify-content: flex-end;
      overflow-x: auto;
    }
    .hotkey-label {
      font-weight: 800;
      font-size: 0.68rem;
      color: #38BDF8;
      white-space: nowrap;
      letter-spacing: 0.5px;
    }
    .hotkey-chip {
      font-size: 0.72rem;
      font-weight: 600;
      color: #CBD5E1;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .hotkey-chip.clear-chip {
      color: #FECACA;
      background: rgba(239, 68, 68, 0.15);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    .hotkey-chip.print-chip {
      color: #E0E7FF;
      background: rgba(99, 102, 241, 0.2);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    kbd {
      background: #4F46E5;
      color: #FFFFFF;
      font-weight: 800;
      padding: 0.08rem 0.35rem;
      border-radius: 4px;
      border: 1px solid #818CF8;
      font-size: 0.68rem;
      letter-spacing: 0.2px;
      font-family: inherit;
    }
    .btn-toggle-hotkeys {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      color: #475569;
      font-weight: 700;
      font-size: 0.78rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .btn-toggle-hotkeys:hover {
      background: #EEF2FF;
      color: #4F46E5;
      border-color: #818CF8;
    }

    .quick-code-bar {
      padding: 1.1rem 1.5rem;
      background: linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 50%, #E0E7FF 100%);
      border: 2px solid #6366F1; border-radius: 14px;
      box-shadow: 0 8px 24px -4px rgba(99, 102, 241, 0.18);
    }
    .quick-code-wrapper { display: flex; gap: 0.85rem; align-items: center; }
    .quick-icon { font-size: 1.6rem; }
    .quick-code-input {
      font-size: 1.15rem; font-weight: 700; height: 50px; border: 2px solid #818CF8;
      border-radius: 10px; background: white; color: #0F172A; padding-left: 1rem;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); transition: all 0.2s ease;
    }
    .quick-code-input:focus {
      border-color: #4F46E5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2), inset 0 2px 4px rgba(0,0,0,0.03);
    }
    .btn-add-code {
      height: 50px; padding: 0 1.5rem; font-size: 1rem; font-weight: 800; border-radius: 10px;
      background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); border: none;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); transition: all 0.2s ease;
    }
    .btn-add-code:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4); }
    .quick-feedback {
      margin-top: 0.5rem; font-weight: 800; font-size: 0.9rem; color: #16A34A;
      display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem;
      background: #F0FDF4; border-radius: 6px; border: 1px solid #BBF7D0;
    }
    .quick-feedback.error { color: #DC2626; background: #FEF2F2; border-color: #FCA5A5; }

    .billing-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 1.5rem; }
    
    /* Mobile/Tablet: Render Cart FIRST, Products SECOND */
    @media (max-width: 1100px) {
      .billing-grid {
        display: flex;
        flex-direction: column;
      }
      .checkout-panel {
        order: 1;
        border: 2px solid #6366F1;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
      }
      .products-section {
        order: 2;
      }
    }

    .search-bar { margin-bottom: 1rem; padding: 1rem; }
    .search-input-wrapper { position: relative; margin-bottom: 0.85rem; }
    .search-icon { position: absolute; left: 0.75rem; top: 0.7rem; font-size: 1rem; color: #94A3B8; }
    .search-input-wrapper input { padding-left: 2.3rem; }
    .category-pills { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem; }
    .pill {
      background: #F1F5F9; border: none; padding: 0.4rem 0.85rem; border-radius: 99px;
      font-size: 0.8rem; font-weight: 600; color: #475569; cursor: pointer; white-space: nowrap;
    }
    .pill.active { background: #4F46E5; color: white; }
    
    .product-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
    .product-item-card {
      cursor: pointer; position: relative; transition: all 0.2s; padding: 1rem;
      border: 1px solid #E2E8F0; display: flex; flex-direction: column; justify-content: space-between;
    }
    .product-item-card:hover { transform: translateY(-2px); border-color: #818CF8; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.12); }
    .product-item-card.out-of-stock { opacity: 0.5; pointer-events: none; }
    .card-top-badges { display: flex; gap: 0.35rem; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap; }
    .quick-code-chip { background: #4F46E5; color: white; font-weight: 800; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px; }
    .prod-badge {
      font-size: 0.65rem; background: #FEF3C7; color: #B45309; font-weight: 700;
      padding: 0.15rem 0.4rem; border-radius: 4px; display: inline-block;
    }
    .prod-badge.danger { background: #FEE2E2; color: #B91C1C; }
    .prod-name { font-weight: 700; font-size: 0.9rem; color: #0F172A; margin-bottom: 0.2rem; }
    .prod-sku { font-size: 0.75rem; color: #64748B; margin-bottom: 0.75rem; }
    .prod-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .prod-price { font-weight: 800; font-size: 1rem; color: #4F46E5; }
    .prod-gst { font-size: 0.7rem; color: #64748B; }
    .stock-info { font-size: 0.7rem; color: #64748B; margin-top: 0.5rem; border-top: 1px dashed #E2E8F0; padding-top: 0.4rem; }
    
    .checkout-panel { display: flex; flex-direction: column; height: fit-content; }
    .cart-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .cart-header-row .panel-title { margin-bottom: 0; }
    .btn-clear-cart {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FCA5A5;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s ease;
    }
    .btn-clear-cart:hover {
      background: #EF4444;
      color: white;
      border-color: #DC2626;
    }
    .hotkey-kbd {
      background: rgba(0, 0, 0, 0.1);
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-size: 0.68rem;
      font-family: monospace;
    }
    .cust-select-group { display: flex; gap: 0.5rem; }
    .cart-items-wrapper {
      max-height: 280px;
      overflow-y: auto;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 1rem 0;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
    }
    .cart-table { width: 100%; min-width: 320px; border-collapse: collapse; font-size: 0.85rem; }
    .cart-table th { background: #F8FAFC; padding: 0.6rem 0.75rem; border-bottom: 1px solid #E2E8F0; text-align: left; }
    .cart-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
    .code-tag { background: #EEF2FF; color: #4F46E5; font-weight: 800; font-size: 0.75rem; padding: 0.1rem 0.3rem; border-radius: 3px; margin-right: 0.3rem; }
    .qty-control { display: flex; align-items: center; gap: 0.35rem; }
    .qty-control button {
      width: 24px; height: 24px; border-radius: 4px; border: 1px solid #CBD5E1;
      background: white; cursor: pointer; font-weight: 700; display: flex; align-items: center; justify-content: center;
    }
    .btn-remove { background: none; border: none; cursor: pointer; font-size: 1rem; }
    .empty-cart-msg { text-align: center; color: #94A3B8; padding: 1.5rem !important; }
    .calculation-summary { background: #F8FAFC; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #E2E8F0; }
    .calc-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 0.4rem; color: #475569; }
    .discount-input { width: 90px; padding: 0.25rem 0.5rem; text-align: right; }
    .grand-total-row { border-top: 1px solid #CBD5E1; padding-top: 0.5rem; margin-top: 0.5rem; font-weight: 800; font-size: 1.1rem; color: #0F172A; }
    .grand-price { color: #4F46E5; }
    .method-btns { display: flex; gap: 0.5rem; margin-top: 0.4rem; flex-wrap: wrap; }
    .method-btn {
      flex: 1; min-width: 70px; padding: 0.5rem 0.35rem; border: 1px solid #CBD5E1; border-radius: 6px;
      background: white; font-weight: 700; cursor: pointer; font-size: 0.82rem; text-align: center;
    }
    .method-btn.active { background: #EEF2FF; border-color: #4F46E5; color: #4F46E5; }
    .checkout-btn { width: 100%; margin-top: 1rem; padding: 0.85rem; font-size: 1rem; font-weight: 800; }
    
    /* Printable Invoice Sheet Styles */
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

    /* Mobile Responsive Enhancements */
    @media (max-width: 768px) {
      .top-billing-bar { padding: 0.5rem 0.75rem; gap: 0.5rem; }
      .hotkey-banner-compact { display: none; }
      .quick-code-bar { padding: 0.75rem 0.85rem; border-radius: 10px; }
      .quick-code-wrapper { flex-direction: column; align-items: stretch; gap: 0.5rem; }
      .quick-code-input { height: 44px; font-size: 0.95rem; }
      .btn-add-code { height: 44px; width: 100%; }
      .product-cards-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
      .product-item-card { padding: 0.65rem; }
      .prod-name { font-size: 0.82rem; }
      .prod-price { font-size: 0.9rem; }
      .checkout-panel { padding: 0.85rem; }
      .cart-items-wrapper { max-height: 220px; }
      .cart-table th, .cart-table td { padding: 0.45rem 0.35rem; font-size: 0.78rem; }
      .invoice-modal-content { padding: 1rem; }
      .printable-invoice { padding: 1rem; }
      .inv-header { flex-direction: column; gap: 1rem; }
      .inv-meta { text-align: left; }
    }

    @media (max-width: 480px) {
      .product-cards-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BillingComponent implements OnInit, AfterViewInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  @ViewChild('quickInput') quickInputEl!: ElementRef<HTMLInputElement>;

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  customers: Customer[] = [];
  categories: string[] = [];
  currentShop: Shop | null = null;

  showHotkeys = true;

  quickCodeInput = '';
  quickCodeFeedback = '';
  quickCodeFeedbackIsError = false;

  searchQuery = '';
  selectedCategory = '';
  selectedCustomerId: number | null = null;
  paymentMethod = 'Cash';
  discount = 0;

  cart: CartItem[] = [];
  isProcessing = false;
  errorMessage = '';

  showNewCustomerModal = false;
  newCustName = '';
  newCustPhone = '';

  generatedInvoice: Invoice | null = null;

  ngOnInit() {
    this.authService.currentShop$.subscribe(s => this.currentShop = s);
    this.loadProducts();
    this.loadCustomers();
  }

  ngAfterViewInit() {
    this.focusQuickInput();
  }

  focusQuickInput() {
    setTimeout(() => {
      if (this.quickInputEl) {
        this.quickInputEl.nativeElement.focus();
        this.quickInputEl.nativeElement.select();
      }
    }, 100);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardHotkeys(event: KeyboardEvent) {
    // If printable modal is active, close with Escape or print with Enter
    if (this.generatedInvoice) {
      if (event.key === 'Escape') {
        this.closeInvoiceModal();
        event.preventDefault();
      }
      return;
    }

    // F2 Key -> Focus Quick Code input
    if (event.key === 'F2') {
      event.preventDefault();
      this.focusQuickInput();
      return;
    }

    // F4 Key -> Cycle Payment Method
    if (event.key === 'F4') {
      event.preventDefault();
      this.cyclePaymentMethod();
      return;
    }

    // End Key OR Ctrl+Enter OR F9 -> Instant Checkout & Print Bill
    if (event.key === 'End' || (event.ctrlKey && event.key === 'Enter') || event.key === 'F9') {
      event.preventDefault();
      if (this.cart.length > 0 && !this.isProcessing) {
        this.processCheckout();
      }
      return;
    }

    // Alt + C OR Shift + Delete OR Alt + Delete -> Clear All Cart Items
    if ((event.altKey && (event.key === 'c' || event.key === 'C')) || (event.shiftKey && event.key === 'Delete') || (event.altKey && event.key === 'Delete')) {
      event.preventDefault();
      this.clearCart();
      return;
    }

    // Escape -> Reset Quick Code or Clear selection
    if (event.key === 'Escape') {
      this.quickCodeInput = '';
      this.quickCodeFeedback = '';
      this.focusQuickInput();
    }
  }

  clearCart() {
    if (this.cart.length === 0) return;
    this.cart = [];
    this.discount = 0;
    this.setQuickFeedback('🗑️ Cart cleared!', false);
    this.focusQuickInput();
  }

  cyclePaymentMethod() {
    if (this.paymentMethod === 'Cash') this.paymentMethod = 'UPI';
    else if (this.paymentMethod === 'UPI') this.paymentMethod = 'Card';
    else this.paymentMethod = 'Cash';
  }

  onQuickCodeSubmit(event?: Event) {
    if (event) event.preventDefault();
    const rawVal = this.quickCodeInput.trim();
    if (!rawVal) return;

    let targetCode = rawVal;
    let qty = 1;

    // Check for multiplier format e.g., 1*3 or 1x3
    if (rawVal.includes('*') || rawVal.toLowerCase().includes('x')) {
      const parts = rawVal.split(/[*xX]/);
      if (parts.length === 2) {
        targetCode = parts[0].trim();
        const parsedQty = parseInt(parts[1].trim(), 10);
        if (!isNaN(parsedQty) && parsedQty > 0) {
          qty = parsedQty;
        }
      }
    }

    // Smart Search: 1) Exact Quick Code / SKU / Name match 2) Partial Name match 3) Category / SKU match
    const codeClean = targetCode.toLowerCase();
    let product = this.allProducts.find(p =>
      (p.quick_code && p.quick_code.toLowerCase() === codeClean) ||
      p.sku.toLowerCase() === codeClean ||
      p.name.toLowerCase() === codeClean
    );

    // Fallback: Partial Product Name match (e.g., typing 'tea' matches 'Masala Ginger Tea', 'coffee' matches 'South Filter Coffee')
    if (!product) {
      product = this.allProducts.find(p => p.name.toLowerCase().includes(codeClean));
    }

    // Fallback: Category or SKU partial match
    if (!product) {
      product = this.allProducts.find(p => p.category.toLowerCase().includes(codeClean) || p.sku.toLowerCase().includes(codeClean));
    }

    if (product) {
      if (product.stock_quantity <= 0) {
        this.setQuickFeedback(`⚠️ Product "${product.name}" is OUT OF STOCK!`, true);
      } else {
        this.addToCartWithQty(product, qty);
        this.setQuickFeedback(`✅ Added ${qty}x ${product.name} (₹${product.selling_price * qty})`, false);
      }
      this.quickCodeInput = '';
    } else {
      this.setQuickFeedback(`❌ Item or Code "${targetCode}" not found!`, true);
    }

    this.focusQuickInput();
  }

  setQuickFeedback(msg: string, isError: boolean) {
    this.quickCodeFeedback = msg;
    this.quickCodeFeedbackIsError = isError;
    setTimeout(() => {
      if (this.quickCodeFeedback === msg) {
        this.quickCodeFeedback = '';
      }
    }, 3000);
  }

  loadProducts() {
    this.apiService.getProducts().subscribe(prods => {
      this.allProducts = prods.filter(p => p.is_active);
      this.categories = Array.from(new Set(this.allProducts.map(p => p.category))).filter(Boolean);
      this.filterProducts();
    });
  }

  loadCustomers() {
    this.apiService.getCustomers().subscribe(custs => this.customers = custs);
  }

  onSearchChange() { this.filterProducts(); }
  selectCategory(cat: string) { this.selectedCategory = cat; this.filterProducts(); }

  filterProducts() {
    let list = this.allProducts;
    if (this.selectedCategory) {
      list = list.filter(p => p.category === this.selectedCategory);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.quick_code && p.quick_code.toLowerCase().includes(q))
      );
    }
    this.filteredProducts = list;
  }

  addToCart(product: Product) {
    this.addToCartWithQty(product, 1);
  }

  addToCartWithQty(product: Product, qty: number) {
    if (product.stock_quantity <= 0) return;
    const existing = this.cart.find(i => i.product.id === product.id);
    if (existing) {
      const maxAllowed = product.stock_quantity;
      existing.quantity = Math.min(existing.quantity + qty, maxAllowed);
    } else {
      this.cart.push({ product, quantity: Math.min(qty, product.stock_quantity) });
    }
  }

  updateQuantity(index: number, delta: number) {
    const item = this.cart[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeFromCart(index);
    } else if (newQty <= item.product.stock_quantity) {
      item.quantity = newQty;
    }
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
  }

  getItemTotal(item: CartItem): number {
    const base = item.product.selling_price * item.quantity;
    const gst = (base * item.product.gst_percentage) / 100.0;
    return base + gst;
  }

  get subtotal(): number {
    return this.cart.reduce((acc, i) => acc + (i.product.selling_price * i.quantity), 0);
  }

  get totalGst(): number {
    return this.cart.reduce((acc, i) => {
      const base = i.product.selling_price * i.quantity;
      return acc + ((base * i.product.gst_percentage) / 100.0);
    }, 0);
  }

  get grandTotal(): number {
    return Math.max(0, (this.subtotal + this.totalGst) - (this.discount || 0));
  }

  saveNewCustomer() {
    if (!this.newCustName.trim()) return;
    this.apiService.createCustomer({
      name: this.newCustName.trim(),
      phone: this.newCustPhone.trim() || undefined
    }).subscribe(cust => {
      this.customers.push(cust);
      this.selectedCustomerId = cust.id;
      this.showNewCustomerModal = false;
      this.newCustName = '';
      this.newCustPhone = '';
      this.focusQuickInput();
    });
  }

  processCheckout() {
    if (this.cart.length === 0) return;
    this.isProcessing = true;
    this.errorMessage = '';

    const payload = {
      customer_id: this.selectedCustomerId,
      items: this.cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      discount: this.discount || 0,
      payment_method: this.paymentMethod
    };

    this.apiService.checkout(payload).subscribe({
      next: (invoice) => {
        this.isProcessing = false;
        this.generatedInvoice = invoice;
        this.cart = [];
        this.discount = 0;
        this.loadProducts(); // Refresh stock counts

        // Auto trigger bill print dialog
        setTimeout(() => {
          this.printInvoice();
        }, 300);
      },
      error: (err) => {
        this.isProcessing = false;
        this.errorMessage = err.error?.detail || 'Checkout failed. Check stock availability.';
      }
    });
  }

  printInvoice() {
    window.print();
  }

  closeInvoiceModal() {
    this.generatedInvoice = null;
    this.focusQuickInput();
  }
}

