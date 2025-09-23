import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './my-component/login/login.component';
import { DashboardComponent } from './my-component/dashboard/dashboard.component';
import { AuthGuard } from './my-service/auth.guard';
import { AdminUsersComponent } from './my-component/admin-users/admin-users.component';
import { BesoinsComponent } from './my-component/besoins/besoins.component';
import { AdminRolesComponent } from './my-component/admin-roles/admin-roles.component';
import { CandidatsComponent } from './my-component/candidats/candidats.component';
import { AdminReferencesComponent } from './my-component/admin-references/admin-references.component';
import { PropositionsComponent } from './my-component/propositions/propositions.component';
import { PermissionGuard } from './my-service/permission.guard';

const routes: Routes = [
  { path: '', component: LoginComponent, pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'admin-users', component: AdminUsersComponent, canActivate: [AuthGuard] },
  { path: 'admin-roles', component: AdminRolesComponent, canActivate: [AuthGuard] },
  { path: 'besoins', component: BesoinsComponent, canActivate: [AuthGuard, PermissionGuard], data: { perms: ['ADMIN','BESOIN_READ'] } },
  { path: 'candidats', component: CandidatsComponent, canActivate: [AuthGuard] },
  {
    path: 'propositions',
    component: PropositionsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: { perms: ['ADMIN','PROPOSITION_READ','CAN_VIEW'] }
  },
  {
    path: 'admin-references',
    component: AdminReferencesComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      perms: [
        'ADMIN',
        'REF_MANAGER',
        'REFERENCE_STATUS_READ','REFERENCE_STATUS_CREATE','REFERENCE_STATUS_UPDATE','REFERENCE_STATUS_DELETE',
        'REFERENCE_SITE_READ','REFERENCE_SITE_CREATE','REFERENCE_SITE_UPDATE','REFERENCE_SITE_DELETE',
        'REFERENCE_PRIORITY_READ','REFERENCE_PRIORITY_CREATE','REFERENCE_PRIORITY_UPDATE','REFERENCE_PRIORITY_DELETE'
      ]
    }
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

