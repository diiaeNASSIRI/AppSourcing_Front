import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AdminUserDto {
  fullName: string;
  email: string;
  roleId?: number | null;
  roleName?: string | null;
  permissions: string[] | Set<string>;
  mustChangePassword?: boolean;
  authVersion?: number;
}

export interface RoleDto {
  id: number;
  name: string;
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

  // Roles endpoints
  listRoles(): Observable<{ roles: RoleDto[] }> {
    return this.http.get<{ roles: RoleDto[] }>(`${this.base}/roles`);
  }

  createRole(name: string): Observable<{ name: string }> {
    return this.http.post<{ name: string }>(`${this.base}/roles`, { name });
  }

  renameRole(oldName: string, newName: string): Observable<{ name: string }> {
    return this.http.put<{ name: string }>(`${this.base}/roles/${encodeURIComponent(oldName)}`, { newName });
  }

  deleteRole(name: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${encodeURIComponent(name)}`);
  }

  getRolePermissions(name: string): Observable<{ name: string; permissions: string[] }> {
    return this.http.get<{ name: string; permissions: string[] }>(`${this.base}/roles/${encodeURIComponent(name)}/permissions`);
  }

  setRolePermissions(name: string, permissions: string[]): Observable<{ name: string; permissions: string[] }> {
    return this.http.put<{ name: string; permissions: string[] }>(`${this.base}/roles/${encodeURIComponent(name)}/permissions`, { permissions });
  }

  addRolePermissions(name: string, permissions: string[]): Observable<{ name: string; permissions: string[] }> {
    return this.http.post<{ name: string; permissions: string[] }>(`${this.base}/roles/${encodeURIComponent(name)}/permissions`, { permissions });
  }

  removeRolePermissions(name: string, permissions: string[]): Observable<{ name: string; permissions: string[] }> {
    return this.http.request<{ name: string; permissions: string[] }>('DELETE', `${this.base}/roles/${encodeURIComponent(name)}/permissions`, { body: { permissions } });
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

  // Allow assigning a roleId when creating/updating a user (optional)
  createUser(payload: { fullName: string; email: string; password: string; roleId?: number | null }): Observable<AdminUserDto> {
    return this.http.post<AdminUserDto>(`${this.base}/users`, payload as any);
  }

  updateUser(email: string, payload: { fullName?: string; password?: string; roleId?: number | null }): Observable<AdminUserDto> {
    return this.http.put<AdminUserDto>(`${this.base}/users/${encodeURIComponent(email)}`, payload as any);
  }

  deleteUser(email: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${encodeURIComponent(email)}`);
  }
}
