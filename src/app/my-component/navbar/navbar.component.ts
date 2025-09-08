import { Component, EventEmitter, Input, Output } from '@angular/core';

interface NotificationItem {
  title?: string;
  action?: string;
  timestamp?: string | number | Date;
  message: string;
  type?: string;
  _localRead?: boolean;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Input() email: string = '';
  @Input() unreadCount: number = 0;
  @Input() notifications: NotificationItem[] = [];

  @Output() logoutClick = new EventEmitter<void>();
  @Output() viewAll = new EventEmitter<void>();

  showNotifications = false;
  notifLoading = false;
  notifError: string | null = null;

  get unreadNotifications(): NotificationItem[] {
    // Fallback to provided notifications list. In a real app, filter by read flag.
    return this.notifications;
  }

  openNotifications(): void {
    this.showNotifications = true;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  markOneRead(notif: NotificationItem): void {
    notif._localRead = true;
  }

  markAllLocalRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, _localRead: true }));
  }

  gotoAllNotifications(): void {
    this.viewAll.emit();
  }

  iconFor(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'warning':
        return 'bi bi-exclamation-triangle-fill text-warning';
      case 'success':
        return 'bi bi-check-circle-fill text-success';
      case 'error':
      case 'danger':
        return 'bi bi-x-circle-fill text-danger';
      default:
        return 'bi bi-info-circle-fill text-primary';
    }
  }

  parseStatus(message: string): string {
    const msg = (message || '').toLowerCase();
    if (msg.includes('succès') || msg.includes('success')) return 'Succès';
    if (msg.includes('erreur') || msg.includes('échec') || msg.includes('echec') || msg.includes('error')) return 'Erreur';
    if (msg.includes('attente') || msg.includes('pending')) return 'En attente';
    return 'Info';
  }

  statusBadgeClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('succès') || s.includes('succ') || s.includes('success')) return 'bg-success';
    if (s.includes('erreur') || s.includes('error') || s.includes('échec') || s.includes('echec')) return 'bg-danger';
    if (s.includes('attente') || s.includes('pending')) return 'bg-warning text-dark';
    return 'bg-secondary';
  }

  logout(): void {
    this.logoutClick.emit();
  }
}
