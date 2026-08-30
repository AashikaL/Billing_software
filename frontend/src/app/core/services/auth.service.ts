import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

  private currentShopSubject = new BehaviorSubject<Shop | null>(null);
  public currentShop$ = this.currentShopSubject.asObservable();

  constructor() {
    if (this.getToken()) {
      this.loadShopProfile();
    }
  }

  public register(payload: any): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/register`, payload).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  public login(payload: any): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  public loadShopProfile(): void {
    this.http.get<Shop>(`${this.apiUrl}/shop/profile`).subscribe({
      next: (shop) => this.currentShopSubject.next(shop),
      error: () => this.currentShopSubject.next(null)
    });
  }

  public setupShop(payload: any): Observable<Shop> {
    return this.http.post<Shop>(`${this.apiUrl}/shop/setup`, payload).pipe(
      tap(shop => this.currentShopSubject.next(shop))
    );
  }

  public logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
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

  private getStoredUser(): User | null {
    const raw = localStorage.getItem('user_info');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    return null;
  }
}
