import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokenKey = 'auth_token';

  constructor(private router: Router, private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let outbound = req;
    if (!req.url.includes('/auth/login')) {
      const token = localStorage.getItem(this.tokenKey);
      if (token) {
        outbound = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }
    }

    return next.handle(outbound).pipe(
      catchError((err) => {
        if (err) {
          const status = err.status;
          const url = req.url || outbound.url || '';
          if (status === 401) {
            // Token expirÃ©/invalidÃ© => dÃ©connexion sauf si dÃ©jÃ  sur login
            const isLogin = url.includes('/auth/login');
            if (!isLogin) {
              this.auth.logout();
              this.router.navigateByUrl('/');
            }
            return throwError(() => err);
          }
          if (status === 403) {
            // Droits insuffisants: on peut dÃ©cider de rester si page change-password
            const isChangePwd = url.includes('/auth/change-password');
            if (false && !isChangePwd) {
              this.auth.logout();
              this.router.navigateByUrl('/');
            }
            return throwError(() => err);
          }
        }
        return throwError(() => err);
      })
    );
  }
}


