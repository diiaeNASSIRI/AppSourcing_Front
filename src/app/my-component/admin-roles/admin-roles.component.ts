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
      next: (res) => {
        const perms = new Set<string>();
        (res.permissions || []).forEach((p: string) => perms.add(this.normalizePermission(p)));
        this.selectedPerms = perms;
      },
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

  // (Ancienne version sans recherche/pagination)

  togglePerm(name: string, checked: boolean): void {
    const perm = this.normalizePermission(name);
    if (checked) {
      this.selectedPerms.add(perm);
      const view = this.viewFor(perm);
      if (view) this.selectedPerms.add(view);
    } else {
      this.selectedPerms.delete(perm);
      if (this.isViewPerm(perm)) {
        const siblings = this.dependentsForView(perm);
        siblings.forEach((p) => this.selectedPerms.delete(p));
      }
    }
  }

  savePermissions(): void {
    if (!this.selectedRole) return;
    const perms = Array.from(new Set(Array.from(this.selectedPerms).map((p) => this.normalizePermission(p))))
      .filter(p => p !== 'ADMIN_PANEL');
    this.admin.setRolePermissions(this.selectedRole.name, perms).subscribe({
      next: (res) => {
        this.success = 'Permissions updated';
        const permsResp = new Set<string>();
        (res.permissions || []).forEach((p: string) => permsResp.add(this.normalizePermission(p)));
        this.selectedPerms = permsResp;
      },
      error: (err) => { this.error = err?.error?.message || 'Update permissions failed'; }
    });
  }

  private groupByPrefix(prefix: string): string[] {
    return (this.permissionsAll || []).filter(p => p.startsWith(prefix));
  }

  get permsAdmin(): string[] { return this.groupByPrefix('ADMIN_'); }
  get permsBesoin(): string[] { return this.groupByPrefix('BESOIN_'); }
  get permsCandidat(): string[] { return this.groupByPrefix('CANDIDAT_'); }
  get permsProposition(): string[] {
    const primary = (this.permissionsAll || []).filter(p => p.startsWith('PROPOSITION_'));
    if (primary.length) {
      return [...new Set(primary)].sort();
    }
    const legacy = (this.permissionsAll || []).filter(p => p.startsWith('CAN_'));
    return [...new Set(legacy)].sort();
  }

  trackByPerm(index: number, p: string): string { return p; }

  setGroup(prefix: string, checked: boolean): void {
    const list = this.groupByPrefix(prefix);
    if (checked) list.forEach(p => this.selectedPerms.add(this.normalizePermission(p)));
    else list.forEach(p => this.selectedPerms.delete(this.normalizePermission(p)));
  }

  setPropositionGroup(checked: boolean): void {
    const list = [...new Set(this.permsProposition.map(p => this.normalizePermission(p)))];
    if (checked) {
      list.forEach(p => this.togglePerm(p, true));
    } else {
      list
        .filter(p => !this.isViewPerm(p))
        .forEach(p => this.togglePerm(p, false));
      list
        .filter(p => this.isViewPerm(p))
        .forEach(p => this.togglePerm(p, false));
    }
  }

  canViewAdminRoles(): boolean { return this.auth.hasAny('ADMIN','ADMIN_MANAGE_ROLES_CAN_VIEW'); }
  canEditAdminRoles(): boolean { return this.auth.hasAny('ADMIN','ADMIN_MANAGE_ROLES_CAN_EDIT'); }

  private isViewPerm(p: string): boolean {
    return p === 'ADMIN_MANAGE_ROLES_CAN_VIEW'
      || p === 'ADMIN_MANAGE_USERS_CAN_VIEW'
      || p === 'CAN_VIEW'
      || p === 'PROPOSITION_READ'
      || p.endsWith('_READ');
  }

  private viewFor(p: string): string | null {
    if (p === 'ADMIN_MANAGE_ROLES_CAN_EDIT') return 'ADMIN_MANAGE_ROLES_CAN_VIEW';
    if (p === 'ADMIN_MANAGE_USERS_CAN_EDIT') return 'ADMIN_MANAGE_USERS_CAN_VIEW';
    if (p === 'CAN_CREATE' || p === 'CAN_EDIT' || p === 'CAN_DELETE') return 'CAN_VIEW';
    if (p === 'PROPOSITION_CREATE' || p === 'PROPOSITION_EDIT' || p === 'PROPOSITION_DELETE') return 'PROPOSITION_READ';
    if (p.startsWith('BESOIN_')) return p.endsWith('_READ') ? p : 'BESOIN_READ';
    if (p.startsWith('CANDIDAT_')) return p.endsWith('_READ') ? p : 'CANDIDAT_READ';
    if (p.startsWith('REFERENCE_STATUS_')) return p.endsWith('_READ') ? p : 'REFERENCE_STATUS_READ';
    if (p.startsWith('REFERENCE_SITE_')) return p.endsWith('_READ') ? p : 'REFERENCE_SITE_READ';
    if (p.startsWith('REFERENCE_PRIORITY_')) return p.endsWith('_READ') ? p : 'REFERENCE_PRIORITY_READ';
    return null;
  }

  private dependentsForView(view: string): string[] {
    switch (view) {
      case 'ADMIN_MANAGE_ROLES_CAN_VIEW': return ['ADMIN_MANAGE_ROLES_CAN_EDIT'];
      case 'ADMIN_MANAGE_USERS_CAN_VIEW': return ['ADMIN_MANAGE_USERS_CAN_EDIT'];
      case 'CAN_VIEW': return ['CAN_CREATE','CAN_EDIT','CAN_DELETE'];
      case 'PROPOSITION_READ': return ['PROPOSITION_CREATE','PROPOSITION_EDIT','PROPOSITION_DELETE'];
      case 'BESOIN_READ': return ['BESOIN_CREATE','BESOIN_UPDATE','BESOIN_DELETE'];
      case 'CANDIDAT_READ': return ['CANDIDAT_CREATE','CANDIDAT_UPDATE','CANDIDAT_DELETE'];
      case 'REFERENCE_STATUS_READ': return ['REFERENCE_STATUS_CREATE','REFERENCE_STATUS_UPDATE','REFERENCE_STATUS_DELETE'];
      case 'REFERENCE_SITE_READ': return ['REFERENCE_SITE_CREATE','REFERENCE_SITE_UPDATE','REFERENCE_SITE_DELETE'];
      case 'REFERENCE_PRIORITY_READ': return ['REFERENCE_PRIORITY_CREATE','REFERENCE_PRIORITY_UPDATE','REFERENCE_PRIORITY_DELETE'];
      default: return [];
    }
  }

  private normalizePermission(name: string): string {
    switch (name) {
      case 'CAN_VIEW': return 'PROPOSITION_READ';
      case 'CAN_CREATE': return 'PROPOSITION_CREATE';
      case 'CAN_EDIT': return 'PROPOSITION_EDIT';
      case 'CAN_DELETE': return 'PROPOSITION_DELETE';
      default: return name;
    }
  }
}
