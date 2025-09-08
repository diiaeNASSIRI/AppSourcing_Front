import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { AdminServiceClient, AdminUserDto } from '../../my-service/admin.service';
import { AuthService } from '../../my-service/auth.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  @ViewChild('createUserTpl') createUserTpl!: TemplateRef<any>;
  @ViewChild('editUserTpl') editUserTpl!: TemplateRef<any>;
  // Data
  users: AdminUserDto[] = [];
  permissionsAll: string[] = [];

  // UI state
  loading = false;
  error: string | null = null;
  success: string | null = null;

  selectedUser: AdminUserDto | null = null;
  selectedPerms = new Set<string>();

  private activeModal?: NgbModalRef;

  // Forms
  createForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['USER']
  });

  editForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    role: [''],
    password: ['']
  });

  // Table UI state (SB Admin style)
  searchControl = new FormControl<string>('', { nonNullable: true });
  page = 1;
  pageSize = 20;
  sortKey: 'fullName' | 'email' | 'role' = 'fullName';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private admin: AdminServiceClient,
    private fb: FormBuilder,
    private auth: AuthService,
    private modal: NgbModal
  ) {}

  ngOnInit(): void {
    // Debug: log authorities/claims for 403 diagnosis
    const claims = this.auth.getJwtClaims();
    const authorities = this.auth.getAuthoritiesFromToken();
    console.info('[AdminUsersComponent] JWT claims:', claims);
    console.info('[AdminUsersComponent] Authorities in token:', authorities);
    console.info('[AdminUsersComponent] isAdmin token check:', this.auth.isAdmin());

    this.refresh();
    this.loadPermissions();
  }

  // Derived lists for table
  get filteredUsers(): AdminUserDto[] {
    const q = (this.searchControl.value || '').trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u => (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    ));
  }

  get sortedUsers(): AdminUserDto[] {
    const arr = [...this.filteredUsers];
    const k = this.sortKey;
    const d = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a: any, b: any) => {
      const av = (a?.[k] ?? '').toString().toLowerCase();
      const bv = (b?.[k] ?? '').toString().toLowerCase();
      if (av < bv) return -1 * d;
      if (av > bv) return 1 * d;
      return 0;
    });
    return arr;
  }

  get pageItems(): AdminUserDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sortedUsers.slice(start, start + this.pageSize);
  }

  get totalItems(): number {
    return this.filteredUsers.length;
  }

  setSort(key: 'fullName'|'email'|'role'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }

  refresh(): void {
    this.loading = true;
    this.error = null;
    console.log('[AdminUsersComponent] Fetching users from /admin/users ...');
    this.admin.listUsers().subscribe({
      next: (res) => {
        console.log('[AdminUsersComponent] Users loaded:', res);
        this.users = res.users || [];
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        // Log as much diagnostic info as possible
        console.error('[AdminUsersComponent] listUsers failed', {
          status: err?.status,
          statusText: err?.statusText,
          url: err?.url,
          message: err?.message,
          error: err?.error,
        });
        if (err?.status === 403) {
          this.error = 'Accès refusé (ADMIN requis). Vérifiez votre rôle/permissions.';
        } else if (err?.status === 401) {
          this.error = 'Session invalide/expirée. Veuillez vous reconnecter.';
        } else {
          this.error = err?.error?.message || 'Erreur lors du chargement des utilisateurs';
        }
      }
    });
  }

  loadPermissions(): void {
    this.admin.listAvailablePermissions().subscribe({
      next: (res) => {
        this.permissionsAll = res.permissions || [];
      },
      error: () => {
        // non bloquant
      }
    });
  }

  openCreate(): void {
    this.createForm.reset({ role: 'USER' });
    this.error = null;
    this.success = null;
    this.activeModal = this.modal.open(this.createUserTpl, { centered: true });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.error = null;
    const { fullName, email, password, role } = this.createForm.getRawValue() as any;
    this.admin.createUser({ fullName, email, password, role }).subscribe({
      next: () => {
        this.success = 'Utilisateur créé';
        this.createForm.reset({ role: 'USER' });
        this.refresh();
        this.activeModal?.close();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Création échouée';
      }
    });
  }

  startEdit(u: AdminUserDto): void {
    this.selectedUser = u;
    this.editForm.reset({ fullName: u.fullName, role: u.role || '' });
    // permissions selection state
    this.selectedPerms = new Set<string>(Array.from(u.permissions || [] as any));
    this.error = null;
    this.success = null;
    this.activeModal = this.modal.open(this.editUserTpl, { size: 'lg', centered: true, backdrop: 'static' });
  }

  cancelEdit(): void {
    this.selectedUser = null;
    this.editForm.reset();
    this.selectedPerms.clear();
    this.success = null;
    this.error = null;
    this.activeModal?.dismiss();
  }

  saveUser(): void {
    if (!this.selectedUser) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const email = this.selectedUser.email;
    const { fullName, role, password } = this.editForm.getRawValue() as any;
    this.admin.updateUser(email, { fullName, role, password }).subscribe({
      next: (u) => {
        this.success = 'Utilisateur mis à jour';
        // Update local list
        const idx = this.users.findIndex((x) => x.email === u.email);
        if (idx >= 0) this.users[idx] = u;
        this.selectedUser = u;
        this.activeModal?.close();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Mise à jour échouée';
      }
    });
  }

  // Permission toggles
  isPermChecked(name: string): boolean {
    return this.selectedPerms.has(name);
  }

  togglePerm(name: string, checked: boolean): void {
    if (checked) this.selectedPerms.add(name); else this.selectedPerms.delete(name);
  }

  savePermissions(): void {
    if (!this.selectedUser) return;
    const email = this.selectedUser.email;
    const perms = Array.from(this.selectedPerms);
    this.admin.setUserPermissions(email, perms).subscribe({
      next: (res) => {
        this.success = 'Permissions mises à jour';
        // reflect in list
        const idx = this.users.findIndex((x) => x.email === email);
        if (idx >= 0) this.users[idx].permissions = Array.from(res.permissions as any);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Mise à jour des permissions échouée';
      }
    });
  }

  deleteUser(u: AdminUserDto): void {
    if (!confirm(`Supprimer l'utilisateur ${u.email} ?`)) return;
    this.admin.deleteUser(u.email).subscribe({
      next: () => {
        this.users = this.users.filter(x => x.email !== u.email);
        if (this.selectedUser?.email === u.email) this.cancelEdit();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Suppression échouée';
      }
    });
  }

  // Helpers
  toArray(perms: string[] | Set<string> | null | undefined): string[] {
    if (!perms) return [];
    return Array.isArray(perms) ? perms : Array.from(perms);
  }
}
