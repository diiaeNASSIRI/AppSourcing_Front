import { Component, Input } from '@angular/core';
import { AuthService } from '../../my-service/auth.service';
import { Roles } from '../../config/permissions';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() isAdmin: boolean = false;

  constructor(public readonly auth: AuthService) {}

  // Visibility by permissions: show entries only if user can view the section
  get canSeeAdminUsers(): boolean {
    return this.auth.hasAny('ADMIN', 'ADMIN_MANAGE_USERS_CAN_VIEW');
  }

  get canSeeAdminRoles(): boolean {
    return this.auth.hasAny('ADMIN', 'ADMIN_MANAGE_ROLES_CAN_VIEW');
  }

  get canSeeBesoins(): boolean {
    return this.auth.hasAny('ADMIN', 'BESOIN_READ');
  }

  get canSeeCandidats(): boolean {
    return this.auth.hasAny('ADMIN', 'CANDIDAT_READ');
  }

  get canSeeReferences(): boolean {
    return this.auth.hasAny(
      Roles.Admin,
      'REF_MANAGER',
      'REFERENCE_STATUS_READ',
      'REFERENCE_SITE_READ',
      'REFERENCE_PRIORITY_READ'
    );
  }
}

