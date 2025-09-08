import { Component } from '@angular/core';
import { AuthService, UserInfoResponse } from '../../my-service/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  me?: UserInfoResponse;

  constructor(private auth: AuthService) {
    this.auth.me().subscribe({
      next: (u) => (this.me = u),
      error: () => (this.me = undefined),
    });
  }
}

