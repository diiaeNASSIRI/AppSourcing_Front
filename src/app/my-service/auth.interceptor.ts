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
    // Ne pas ajouter le header sur le login
    let outbound = req;
    if (!req.url.includes('/auth/login')) {
      const token = localStorage.getItem(this.tokenKey);
      if (token) {
        outbound = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }
    }

    return next.handle(outbound).pipe(
      catchError((err) => {
        if (err && (err.status === 401 || err.status === 403)) {
          // Token expiré/invalidé (ex: ver mismatch) → logout + retour login
          this.auth.logout();
          this.router.navigateByUrl('/');
        }
        return throwError(() => err);
      })
    );
  }
}
