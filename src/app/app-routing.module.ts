import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './my-component/login/login.component';
import { DashboardComponent } from './my-component/dashboard/dashboard.component';
import { AuthGuard } from './my-service/auth.guard';
import { AdminUsersComponent } from './my-component/admin-users/admin-users.component';
import { BesoinsComponent } from './my-component/besoins/besoins.component';
import { CandidatsComponent } from './my-component/candidats/candidats.component';

const routes: Routes = [
  { path: '', component: LoginComponent, pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'admin-users', component: AdminUsersComponent, canActivate: [AuthGuard] },
  { path: 'besoins', component: BesoinsComponent, canActivate: [AuthGuard] },
  { path: 'candidats', component: CandidatsComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
