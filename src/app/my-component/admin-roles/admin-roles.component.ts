import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AdminServiceClient, RoleDto } from '../../my-service/admin.service';
import { AuthService } from '../../my-service/auth.service';

@Component({
  selector: 'app-admin-roles',
  templateUrl: './admin-roles.component.html',
  styleUrls: ['./admin-roles.component.css']
})
export class AdminRolesComponent implements OnInit {
  roles: RoleDto[] = [];
  permissionsAll: string[] = [];
  selectedRole: RoleDto | null = null;
  selectedPerms = new Set<string>();
  loading = false;
  error: string | null = null;
  success: string | null = null;

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  renameForm = this.fb.group({
    newName: ['', [Validators.required, Validators.minLength(2)]]
  });

  constructor(private fb: FormBuilder, private admin: AdminServiceClient, public readonly auth: AuthService) {}

  ngOnInit(): void {
    this.refresh();
    this.loadPermissions();
  }

  refresh(): void {
    this.loading = true;
    this.error = null;
    this.admin.listRoles().subscribe({
      next: (res) => { this.roles = res.roles || []; this.loading = false; },
      error: (err) => { this.loading = false; this.error = err?.error?.message || 'Failed to load roles'; }
    });
  }

  loadPermissions(): void {
    this.admin.listAvailablePermissions().subscribe({
      next: (res) => this.permissionsAll = res.permissions || [],
      error: () => {}
    });
  }

  selectRole(r: RoleDto): void {
    this.selectedRole = r;
    this.renameForm.reset({ newName: r.name });
    this.selectedPerms.clear();
    this.admin.getRolePermissions(r.name).subscribe({
      next: (res) => { this.selectedPerms = new Set(res.permissions || []); },
      error: () => { this.selectedPerms = new Set(); }
    });
  }

  createRole(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    const { name } = this.createForm.getRawValue() as any;
    this.admin.createRole(name).subscribe({
      next: () => { this.success = 'Role created'; this.createForm.reset(); this.refresh(); },
      error: (err) => { this.error = err?.error?.message || 'Create failed'; }
    });
  }

  renameRole(): void {
    if (!this.selectedRole) return;
    if (this.renameForm.invalid) { this.renameForm.markAllAsTouched(); return; }
    const { newName } = this.renameForm.getRawValue() as any;
    this.admin.renameRole(this.selectedRole.name, newName).subscribe({
      next: () => { this.success = 'Role renamed'; this.refresh(); },
      error: (err) => { this.error = err?.error?.message || 'Rename failed'; }
    });
  }

  deleteRole(r: RoleDto): void {
    if (!confirm(`Delete role ${r.name}?`)) return;
    this.admin.deleteRole(r.name).subscribe({
      next: () => { if (this.selectedRole?.id === r.id) { this.selectedRole = null; } this.refresh(); },
      error: (err) => { this.error = err?.error?.message || 'Delete failed'; }
    });
  }

  togglePerm(name: string, checked: boolean): void {
    // Core toggle
    if (checked) {
      this.selectedPerms.add(name);
      // If enabling a non-view permission, ensure its view dependency is set
      const view = this.viewFor(name);
      if (view) this.selectedPerms.add(view);
    } else {
      this.selectedPerms.delete(name);
      // If disabling a view permission, remove dependent siblings
      if (this.isViewPerm(name)) {
        const siblings = this.dependentsForView(name);
        siblings.forEach((p) => this.selectedPerms.delete(p));
      }
    }
  }

  savePermissions(): void {
    if (!this.selectedRole) return;
    const perms = Array.from(this.selectedPerms).filter(p => !p.startsWith('CAN_') && p !== 'ADMIN_PANEL');
    this.admin.setRolePermissions(this.selectedRole.name, perms).subscribe({
      next: (res) => { this.success = 'Permissions updated'; this.selectedPerms = new Set(res.permissions || []); },
      error: (err) => { this.error = err?.error?.message || 'Update permissions failed'; }
    });
  }

  // --- Grouped permissions helpers for clearer UI ---
  private groupByPrefix(prefix: string): string[] {
    return (this.permissionsAll || []).filter(p => p.startsWith(prefix));
  }

  get permsAdmin(): string[] { return this.groupByPrefix('ADMIN_'); }
  get permsBesoin(): string[] { return this.groupByPrefix('BESOIN_'); }
  get permsCandidat(): string[] { return this.groupByPrefix('CANDIDAT_'); }

  trackByPerm(index: number, p: string): string { return p; }

  setGroup(prefix: string, checked: boolean): void {
    const list = this.groupByPrefix(prefix);
    if (checked) list.forEach(p => this.selectedPerms.add(p));
    else list.forEach(p => this.selectedPerms.delete(p));
  }

  // Current-user permission checks for Admin Roles page
  canViewAdminRoles(): boolean { return this.auth.hasAny('ADMIN','ADMIN_MANAGE_ROLES_CAN_VIEW'); }
  canEditAdminRoles(): boolean { return this.auth.hasAny('ADMIN','ADMIN_MANAGE_ROLES_CAN_EDIT'); }

  // --- Dependency helpers ---
  private isViewPerm(p: string): boolean {
    return p === 'ADMIN_MANAGE_ROLES_CAN_VIEW'
      || p === 'ADMIN_MANAGE_USERS_CAN_VIEW'
      || p.endsWith('_READ');
  }

  private viewFor(p: string): string | null {
    // Admin roles/users: EDIT depends on VIEW
    if (p === 'ADMIN_MANAGE_ROLES_CAN_EDIT') return 'ADMIN_MANAGE_ROLES_CAN_VIEW';
    if (p === 'ADMIN_MANAGE_USERS_CAN_EDIT') return 'ADMIN_MANAGE_USERS_CAN_VIEW';

    // Besoins
    if (p.startsWith('BESOIN_')) return p.endsWith('_READ') ? p : 'BESOIN_READ';

    // Candidats main
    if (p.startsWith('CANDIDAT_NOTE_')) return p.endsWith('_READ') ? p : 'CANDIDAT_NOTE_READ';
    if (p.startsWith('CANDIDAT_CV_')) return p.endsWith('_READ') ? p : 'CANDIDAT_CV_READ';
    if (p.startsWith('CANDIDAT_')) return p.endsWith('_READ') ? p : 'CANDIDAT_READ';

    return null;
  }

  private dependentsForView(view: string): string[] {
    switch (view) {
      case 'ADMIN_MANAGE_ROLES_CAN_VIEW':
        return ['ADMIN_MANAGE_ROLES_CAN_EDIT'];
      case 'ADMIN_MANAGE_USERS_CAN_VIEW':
        return ['ADMIN_MANAGE_USERS_CAN_EDIT'];
      case 'BESOIN_READ':
        return ['BESOIN_CREATE','BESOIN_UPDATE','BESOIN_DELETE'];
      case 'CANDIDAT_READ':
        return ['CANDIDAT_CREATE','CANDIDAT_UPDATE','CANDIDAT_DELETE'];
      case 'CANDIDAT_NOTE_READ':
        return ['CANDIDAT_NOTE_CREATE','CANDIDAT_NOTE_UPDATE','CANDIDAT_NOTE_DELETE'];
      case 'CANDIDAT_CV_READ':
        return ['CANDIDAT_CV_UPLOAD','CANDIDAT_CV_DELETE'];
      default:
        return [];
    }
  }
}
