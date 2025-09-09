import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  mustChangePassword?: boolean;
}

export interface UserInfoResponse {
  fullName: string;
  email: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // TODO: déporter vers environments si souhaité
  private readonly apiBase = '';
  private readonly tokenKey = 'auth_token';

  private readonly loggedIn$ = new BehaviorSubject<boolean>(!!this.getToken());

  constructor(private http: HttpClient) {}

  isLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiBase}/auth/login`, payload)
      .pipe(
        tap((res) => {
          if (res?.token) {
            this.setToken(res.token);
          }
        })
      );
  }

  me(): Observable<UserInfoResponse> {
    return this.http.get<UserInfoResponse>(`${this.apiBase}/auth/me`, {
      headers: this.authHeaders(),
    });
  }

  changePassword(payload: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiBase}/auth/change-password`, payload, {
      headers: this.authHeaders(),
    });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.loggedIn$.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.loggedIn$.next(true);
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  // --- Debug helpers: decode JWT claims and authorities ---
  getJwtClaims(): Record<string, any> | null {
    const token = this.getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch (e) {
      console.warn('[AuthService] Failed to decode JWT payload', e);
      return null;
    }
  }

  /**
   * Extract the current user's email/identifier from the JWT claims if present.
   * Tries common claim names in order of preference.
   */
  getEmailFromToken(): string | null {
    const claims = this.getJwtClaims();
    if (!claims) return null;
    const c: any = claims;
    return (
      c['email'] ||
      c['preferred_username'] ||
      c['upn'] ||
      c['unique_name'] ||
      c['sub'] ||
      null
    );
  }

  getAuthoritiesFromToken(): string[] {
    const claims = this.getJwtClaims();
    if (!claims) return [];

    // Collect from multiple possible claim keys used by backends
    const pool: string[] = [];
    const add = (val: unknown) => {
      if (!val) return;
      if (Array.isArray(val)) pool.push(...val.map(String));
      else if (typeof val === 'string') pool.push(...val.split(/[ ,]+/).filter(Boolean));
    };

    add((claims as any)['authorities']);
    add((claims as any)['permissions']);
    add((claims as any)['perms']);
    add((claims as any)['roles']);
    add((claims as any)['role']);
    add((claims as any)['scopes']);
    add((claims as any)['scope']);

    // Support Keycloak/OpenID style role placement
    // realm_access.roles => array of role names
    try {
      const anyClaims: any = claims;
      if (anyClaims?.realm_access && Array.isArray(anyClaims.realm_access.roles)) {
        add(anyClaims.realm_access.roles);
      }
      // resource_access => { <client>: { roles: [...] } }
      if (anyClaims?.resource_access && typeof anyClaims.resource_access === 'object') {
        Object.values(anyClaims.resource_access).forEach((v: any) => {
          if (v && Array.isArray(v.roles)) add(v.roles);
        });
      }
    } catch (e) {
      // ignore malformed nested claims
    }

    // Normalize duplicates and return
    return Array.from(new Set(pool));
  }

  hasAuthority(name: string): boolean {
    return this.getAuthoritiesFromToken().some((a) => a === name || a === `ROLE_${name}`);
  }

  isAdmin(): boolean {
    // Consider admin if has global ADMIN or any admin view permission
    return (
      this.hasAuthority('ADMIN') ||
      this.hasAuthority('ADMIN_MANAGE_USERS_CAN_VIEW') ||
      this.hasAuthority('ADMIN_MANAGE_ROLES_CAN_VIEW')
    );
  }

  hasAny(...names: string[]): boolean {
    return names.some((n) => this.hasAuthority(n));
  }
}
