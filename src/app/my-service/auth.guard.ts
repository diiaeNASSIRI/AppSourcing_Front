import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const token = this.auth.getToken();
    if (!token) return this.router.parseUrl('/');

    // Optionnel: vérifier l'expiration locale du JWT
    const claims = this.auth.getJwtClaims() as any;
    if (claims && typeof claims.exp === 'number') {
      const expMs = claims.exp * 1000;
      if (Date.now() >= expMs) {
        this.auth.logout();
        return this.router.parseUrl('/');
      }
    }
    return true;
  }
}
