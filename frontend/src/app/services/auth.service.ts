import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User, AuthResponse } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private _loading = signal<boolean>(false);

  user = this._user.asReadonly();
  token = this._token.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => !!this._token() && !!this._user());

  constructor(
    private api: ApiService,
    private router: Router
  ) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        this._token.set(token);
        this._user.set(JSON.parse(user));
      } catch {
        this.clearStorage();
      }
    }
  }

  private saveToStorage(token: string, user: User) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  private clearStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  register(email: string, password: string) {
    this._loading.set(true);
    return this.api.post<AuthResponse>('/auth/register', { email, password }).pipe(
      tap((res) => {
        this._token.set(res.token);
        this._user.set(res.user);
        this.saveToStorage(res.token, res.user);
        this.router.navigate(['/dashboard']);
      }),
      finalize(() => this._loading.set(false)),
    );
  }

  login(email: string, password: string) {
    this._loading.set(true);
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap((res) => {
        this._token.set(res.token);
        this._user.set(res.user);
        this.saveToStorage(res.token, res.user);
        this.router.navigate(['/dashboard']);
      }),
      finalize(() => this._loading.set(false)),
    );
  }

  logout() {
    this._user.set(null);
    this._token.set(null);
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  getCurrentUser() {
    return this.api.get<{ user: User }>('/auth/me').subscribe({
      next: (res) => {
        this._user.set(res.user);
        this.saveToStorage(this._token()!, res.user);
      },
      error: () => {
        this.logout();
      },
    });
  }
}