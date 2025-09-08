import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AdminUserDto {
  fullName: string;
  email: string;
  role: string;
  permissions: string[] | Set<string>;
  mustChangePassword?: boolean;
}

export interface ListUsersResponse {
  users: AdminUserDto[];
}

export interface UpdatePermissionsRequest {
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminServiceClient {
  private readonly base = '/admin';

  constructor(private http: HttpClient) {}

  // Permissions endpoints
  listAvailablePermissions(): Observable<{ permissions: string[] }> {
    return this.http.get<{ permissions: string[] }>(`${this.base}/permissions/available`);
  }

  getUserPermissions(email: string): Observable<{ email: string; permissions: string[] | Set<string> }> {
    return this.http.get<{ email: string; permissions: string[] | Set<string> }>(`${this.base}/permissions/users/${encodeURIComponent(email)}`);
  }

  setUserPermissions(email: string, permissions: string[]): Observable<{ email: string; permissions: string[] | Set<string> }> {
    const body: UpdatePermissionsRequest = { permissions };
    return this.http.put<{ email: string; permissions: string[] | Set<string> }>(`${this.base}/permissions/users/${encodeURIComponent(email)}`, body);
  }

  addUserPermissions(email: string, permissions: string[]): Observable<{ email: string; permissions: string[] | Set<string> }> {
    const body: UpdatePermissionsRequest = { permissions };
    return this.http.post<{ email: string; permissions: string[] | Set<string> }>(`${this.base}/permissions/users/${encodeURIComponent(email)}`, body);
  }

  removeUserPermissions(email: string, permissions: string[]): Observable<{ email: string; permissions: string[] | Set<string> }> {
    const body: UpdatePermissionsRequest = { permissions };
    return this.http.request<{ email: string; permissions: string[] | Set<string> }>('DELETE', `${this.base}/permissions/users/${encodeURIComponent(email)}`, { body });
  }

  // Users CRUD
  listUsers(): Observable<ListUsersResponse> {
    return this.http.get<ListUsersResponse>(`${this.base}/users`).pipe(
      tap({
        next: (res) => console.debug('[AdminService] listUsers OK', res),
        error: (err) => console.error('[AdminService] listUsers ERROR', err)
      })
    );
  }

  getUser(email: string): Observable<AdminUserDto> {
    return this.http.get<AdminUserDto>(`${this.base}/users/${encodeURIComponent(email)}`);
  }

  createUser(payload: { fullName: string; email: string; password: string; role?: string }): Observable<AdminUserDto> {
    return this.http.post<AdminUserDto>(`${this.base}/users`, payload);
  }

  updateUser(email: string, payload: { fullName?: string; role?: string; password?: string }): Observable<AdminUserDto> {
    return this.http.put<AdminUserDto>(`${this.base}/users/${encodeURIComponent(email)}`, payload);
  }

  deleteUser(email: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${encodeURIComponent(email)}`);
  }
}
