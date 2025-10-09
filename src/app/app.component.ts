import { Component, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './my-service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'appsourcing-frontend-01';

  showChrome = false; // navbar + sidebar visibility
  email = '';
  isAdmin = false;
  unreadCount = 0;
  notifications: Array<any> = [];
  isMobile = false;
  sidebarOpen = false;

  constructor(private router: Router, private auth: AuthService) {
    // Set initial state and react to route changes
    this.updateChromeVisibility(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.updateChromeVisibility(e.urlAfterRedirects || e.url);
        this.closeSidebarIfOverlay();
      });

    // Initialize user info from JWT (if present) and keep it in sync on login/logout
    this.refreshUserInfo();
    this.auth.isLoggedIn$().subscribe(() => this.refreshUserInfo());

    // Evaluate initial viewport
    this.isMobile = window.innerWidth < 992; // Bootstrap lg breakpoint
  }

  private updateChromeVisibility(url: string): void {
    // Hide chrome on login route (root path)
    const cleanUrl = (url || '').split('?')[0].split('#')[0];
    this.showChrome = cleanUrl !== '/' && cleanUrl !== '';
    if (!this.showChrome) {
      this.sidebarOpen = false;
    }
  }

  private closeSidebarIfOverlay(): void {
    // When browsing on mobile the sidebar floats above the content, so close it after navigation
    if (this.isMobile && this.sidebarOpen) {
      this.sidebarOpen = false;
    }
  }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  goToNotifications(): void {
    // Placeholder navigation; wire to notifications page if exists
    this.router.navigate(['/dashboard']);
  }

  private refreshUserInfo(): void {
    this.email = this.auth.getEmailFromToken() || '';
    this.isAdmin = this.auth.isAdmin();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  @HostListener('window:resize')
  onResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 992;
    if (!this.isMobile && wasMobile) {
      // Ensure sidebar closes overlay mode when returning to desktop
      this.sidebarOpen = false;
    }
  }
}
