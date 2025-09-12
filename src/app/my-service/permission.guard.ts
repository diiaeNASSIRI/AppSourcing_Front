import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const required: string[] = route.data?.['perms'] || [];
    if (!required.length) return true;
    if (this.auth.hasAny(...required)) return true;
    // Redirect to dashboard if logged-in but no permission
    return this.router.parseUrl('/dashboard');
  }
}
