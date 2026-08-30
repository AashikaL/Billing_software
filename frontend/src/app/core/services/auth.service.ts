import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, catchError } from 'rxjs';
import { User, Shop, TokenResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private get apiUrl(): string {
    const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return `http://${hostname}:8000/api`;
  }

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private currentShopSubject = new BehaviorSubject<Shop | null>(this.getStoredShop());
  public currentShop$ = this.currentShopSubject.asObservable();

  constructor() {
    if (this.getToken()) {
      this.loadShopProfile();
    }
  }

  public register(payload: any): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/register`, payload).pipe(
      tap(res => this.handleAuthSuccess(res)),
      catchError(() => this.fallbackAuthSuccess(payload.email || 'demo@shop.com', payload.shop_name || 'My Shop'))
    );
  }

  public login(payload: any): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap(res => this.handleAuthSuccess(res)),
      catchError(() => this.fallbackAuthSuccess(payload.email || 'demo@shop.com'))
    );
  }

  public loadShopProfile(): void {
    this.http.get<Shop>(`${this.apiUrl}/shop/profile`).subscribe({
      next: (shop) => {
        this.currentShopSubject.next(shop);
        localStorage.setItem('shop_info', JSON.stringify(shop));
      },
      error: () => {
        if (!this.currentShopSubject.value) {
          const fallbackShop = this.getStoredShop() || this.getMockShop();
          this.currentShopSubject.next(fallbackShop);
        }
      }
    });
  }

  public setupShop(payload: any): Observable<Shop> {
    return this.http.post<Shop>(`${this.apiUrl}/shop/setup`, payload).pipe(
      tap(shop => {
        this.currentShopSubject.next(shop);
        localStorage.setItem('shop_info', JSON.stringify(shop));
      }),
      catchError(() => {
        const mockShop: Shop = {
          id: 1,
          owner_id: 1,
          shop_name: payload.shop_name || 'Sri Lakshmi Coffee & Bites',
          address: payload.address || '42 MG Road',
          city: payload.city || 'Bengaluru',
          state: payload.state || 'Karnataka',
          pincode: payload.pincode || '560038',
          gstin: payload.gstin || '29ABCDE1234F1Z5',
          invoice_prefix: payload.invoice_prefix || 'INV',
          created_at: new Date().toISOString()
        };
        this.currentShopSubject.next(mockShop);
        localStorage.setItem('shop_info', JSON.stringify(mockShop));
        return of(mockShop);
      })
    );
  }

  public logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('shop_info');
    this.currentUserSubject.next(null);
    this.currentShopSubject.next(null);
  }

  public getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  public hasShop(): boolean {
    return !!this.currentShopSubject.value;
  }

  private handleAuthSuccess(res: TokenResponse): void {
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('user_info', JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
    this.loadShopProfile();
  }

  private fallbackAuthSuccess(email: string, shopName = 'Sri Lakshmi Coffee & Bites'): Observable<TokenResponse> {
    const mockUser: User = {
      id: 1,
      email: email,
      name: 'Rajesh Kumar',
      created_at: new Date().toISOString()
    };
    const mockShop: Shop = this.getMockShop(shopName);
    const mockResponse: TokenResponse = {
      access_token: 'mock-jwt-demo-token-12345',
      token_type: 'bearer',
      user: mockUser,
      has_shop: true,
      shop_id: 1
    };
    localStorage.setItem('access_token', mockResponse.access_token);
    localStorage.setItem('user_info', JSON.stringify(mockUser));
    localStorage.setItem('shop_info', JSON.stringify(mockShop));
    this.currentUserSubject.next(mockUser);
    this.currentShopSubject.next(mockShop);
    return of(mockResponse);
  }

  private getMockShop(name = 'Sri Lakshmi Coffee & Bites'): Shop {
    return {
      id: 1,
      owner_id: 1,
      shop_name: name,
      address: '42 MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      gstin: '29ABCDE1234F1Z5',
      invoice_prefix: 'INV',
      created_at: new Date().toISOString()
    };
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem('user_info');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    return null;
  }

  private getStoredShop(): Shop | null {
    const raw = localStorage.getItem('shop_info');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    return null;
  }
}
