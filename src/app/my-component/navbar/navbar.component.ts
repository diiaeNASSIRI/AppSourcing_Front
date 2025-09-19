import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../my-service/auth.service';

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
  @Output() menuToggle = new EventEmitter<void>();

  showNotifications = false;
  notifLoading = false;
  notifError: string | null = null;

  // Change password modal
  @ViewChild('changePwdTpl') changePwdTpl!: TemplateRef<any>;
  modalRef?: NgbModalRef;
  changeLoading = false;
  changeError: string | null = null;
  changeSuccess: string | null = null;
  showCurrent = false;
  showNew = false;
  showConfirm = false;
  changeForm = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

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
    if (msg.includes('succÃ¨s') || msg.includes('success')) return 'SuccÃ¨s';
    if (msg.includes('erreur') || msg.includes('Ã©chec') || msg.includes('echec') || msg.includes('error')) return 'Erreur';
    if (msg.includes('attente') || msg.includes('pending')) return 'En attente';
    return 'Info';
  }

  statusBadgeClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('succÃ¨s') || s.includes('succ') || s.includes('success')) return 'bg-success';
    if (s.includes('erreur') || s.includes('error') || s.includes('Ã©chec') || s.includes('echec')) return 'bg-danger';
    if (s.includes('attente') || s.includes('pending')) return 'bg-warning text-dark';
    return 'bg-secondary';
  }

  constructor(private fb: FormBuilder, private modal: NgbModal, private auth: AuthService) {}

  logout(): void {
    this.logoutClick.emit();
  }

  openChangePasswordModal(): void {
    this.changeError = null;
    this.changeSuccess = null;
    this.changeForm.reset();
    this.showCurrent = this.showNew = this.showConfirm = false;
    this.modalRef = this.modal.open(this.changePwdTpl, { centered: true, backdrop: 'static', keyboard: false });
  }

  submitChangePassword(): void {
    this.changeError = null;
    this.changeSuccess = null;
    const { currentPassword, newPassword, confirmPassword } = this.changeForm.getRawValue() as any;
    if (!currentPassword || !newPassword || !confirmPassword) {
      this.changeError = 'Veuillez remplir tous les champs.';
      this.changeForm.markAllAsTouched();
      return;
    }
    if (newPassword !== confirmPassword) {
      this.changeError = 'Les mots de passe ne correspondent pas.';
      return;
    }
    this.changeLoading = true;
    this.auth.changePassword({ oldPassword: currentPassword, newPassword }).subscribe({
      next: (res) => {
        this.changeLoading = false;
        this.changeSuccess = res?.message || 'Mot de passe modifiÃ© avec succÃ¨s.';
        setTimeout(() => this.modalRef?.close(), 700);
      },
      error: (err) => {
        this.changeLoading = false;
        this.changeError = err?.error?.message || err?.message || 'Echec de la modification du mot de passe';
      }
    });
  }
}

