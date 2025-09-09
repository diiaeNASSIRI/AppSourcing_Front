import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './my-service/auth.interceptor';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DashboardComponent } from './my-component/dashboard/dashboard.component';
import { LoginComponent } from './my-component/login/login.component';
import { NavbarComponent } from './my-component/navbar/navbar.component';
import { SidebarComponent } from './my-component/sidebar/sidebar.component';
import { AdminUsersComponent } from './my-component/admin-users/admin-users.component';
import { BesoinsComponent } from './my-component/besoins/besoins.component';
import { AdminRolesComponent } from './my-component/admin-roles/admin-roles.component';
import { CandidatsComponent } from './my-component/candidats/candidats.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    NavbarComponent,
    SidebarComponent,
    AdminUsersComponent,
    BesoinsComponent,
    CandidatsComponent,
    AdminRolesComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
