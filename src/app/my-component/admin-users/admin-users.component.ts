import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { AdminServiceClient, AdminUserDto, RoleDto } from '../../my-service/admin.service';
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
  @ViewChild('noAdminUsersView') noAdminUsersView!: TemplateRef<any>;
  // Data
  users: AdminUserDto[] = [];
  roles: RoleDto[] = [];

  // UI state
  loading = false;
  error: string | null = null;
  success: string | null = null;

  selectedUser: AdminUserDto | null = null;

  private activeModal?: NgbModalRef;
  // (role details modal removed) - role/permission management is read-only via user details
  // User details modal state (simple view of role + permissions)
  @ViewChild('userDetailsTpl') userDetailsTpl!: TemplateRef<any>;
  userDetailsName = '';
  userDetailsRole: string | null = null;
  userDetailsPerms: string[] = [];
  userDetailsLoading = false;
  userDetailsError: string | null = null;

  // Forms
  createForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  roleId: [null],
  });

  editForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    password: [''],
  roleId: [null],
  });

  // Table UI state (SB Admin style)
  searchControl = new FormControl<string>('', { nonNullable: true });
  page = 1;
  pageSize = 20;
  sortKey: 'fullName' | 'email' | 'roleName' = 'fullName';
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
    this.loadRoles();
  // roles loading enabled
  }

  loadRoles(): void {
    this.admin.listRoles().subscribe({
      next: (res) => {
        this.roles = res.roles || [];
      },
      error: (err) => {
        console.warn('[AdminUsersComponent] listRoles failed', err);
      }
    });
  }

  // Derived lists for table
  get filteredUsers(): AdminUserDto[] {
    const q = (this.searchControl.value || '').trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u => (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.roleName || '').toLowerCase().includes(q)
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

  setSort(key: 'fullName'|'email'|'roleName'): void {
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
          this.error = 'AccÃ¨s refusÃ© (ADMIN requis). VÃ©rifiez votre rÃ´le/permissions.';
        } else if (err?.status === 401) {
          this.error = 'Session invalide/expirÃ©e. Veuillez vous reconnecter.';
        } else {
          this.error = err?.error?.message || 'Erreur lors du chargement des utilisateurs';
        }
      }
    });
  }

  // No permission grouping/editing in this component

  // Current-user permission checks for Admin Users page
  canViewAdminUsers(): boolean {
    return this.auth.hasAny('ADMIN', 'ADMIN_MANAGE_USERS_CAN_VIEW');
  }
  canEditAdminUsers(): boolean {
    return this.auth.hasAny('ADMIN', 'ADMIN_MANAGE_USERS_CAN_EDIT');
  }

  // loadRoles removed

  openCreate(): void {
    this.createForm.reset();
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
    const { fullName, email, password, roleId } = this.createForm.getRawValue() as any;
  this.admin.createUser({ fullName, email, password, roleId: roleId ?? null }).subscribe({
      next: () => {
        this.success = 'Utilisateur crÃ©Ã©';
    this.createForm.reset();
        this.refresh();
        this.activeModal?.close();
      },
      error: (err) => {
        this.error = err?.error?.message || 'CrÃ©ation Ã©chouÃ©e';
      }
    });
  }

  startEdit(u: AdminUserDto): void {
    this.selectedUser = u;
  this.editForm.reset({ fullName: u.fullName, roleId: (u.roleId ?? null) as any });
    this.error = null;
    this.success = null;
    this.activeModal = this.modal.open(this.editUserTpl, { size: 'lg', centered: true, backdrop: 'static' });
  // nothing else to load here for edit form
  }

  cancelEdit(): void {
    this.selectedUser = null;
    this.editForm.reset();
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
  const { fullName, password, roleId } = this.editForm.getRawValue() as any;
  this.admin.updateUser(email, { fullName, password, roleId: roleId ?? null }).subscribe({
      next: (u) => {
        this.success = 'Utilisateur mis Ã  jour';
        // Update local list
        const idx = this.users.findIndex((x) => x.email === u.email);
        if (idx >= 0) this.users[idx] = u;
        this.selectedUser = u;
        this.activeModal?.close();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Mise Ã  jour Ã©chouÃ©e';
      }
    });
  }

  // Show user details: role and permissions
  showUserDetails(u: AdminUserDto): void {
    this.userDetailsName = u.fullName || u.email;
    this.userDetailsRole = u.roleName ?? null;
    this.userDetailsPerms = Array.isArray(u.permissions) ? u.permissions : Array.from(u.permissions as Set<string> || []);
    this.userDetailsError = null;
    this.userDetailsLoading = false;
    this.activeModal = this.modal.open(this.userDetailsTpl, { size: 'md', centered: true });
  }

  deleteUser(u: AdminUserDto): void {
    if (!confirm(`Supprimer l'utilisateur ${u.email} ?`)) return;
    this.admin.deleteUser(u.email).subscribe({
      next: () => {
        this.users = this.users.filter(x => x.email !== u.email);
        if (this.selectedUser?.email === u.email) this.cancelEdit();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Suppression Ã©chouÃ©e';
      }
    });
  }

  // Helpers
  toArray(perms: string[] | Set<string> | null | undefined): string[] {
    if (!perms) return [];
    return Array.isArray(perms) ? perms : Array.from(perms);
  }

  // Check whether the currently opened user details contain a permission
  hasUserPerm(p: string): boolean {
    if (!this.userDetailsPerms) return false;
    return this.userDetailsPerms.indexOf(p) >= 0;
  }
}

