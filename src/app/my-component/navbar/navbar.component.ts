import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { TranslationService } from '../../config/i18n/translation.service';
import { LanguageCode } from '../../config/i18n/translations';
import { AuthService } from '../../my-service/auth.service';

interface NotificationItem {
  title?: string;
  action?: string;
  timestamp?: string | number | Date;
  message: string;
  type?: string;
  _localRead?: boolean;
}

type NotificationStatus = 'success' | 'error' | 'pending' | 'info';

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

  constructor(
    private fb: FormBuilder,
    private modal: NgbModal,
    private auth: AuthService,
    private translation: TranslationService
  ) {}

  get languageCode(): string {
    return this.translation.language.toUpperCase();
  }

  get nextLanguage(): LanguageCode {
    return this.translation.language === 'fr' ? 'en' : 'fr';
  }

  get nextLanguageName(): string {
    return this.translateKey('navbar.language.name.' + this.nextLanguage);
  }

  switchLanguage(): void {
    const target = this.nextLanguage;
    this.translation.setLanguage(target);
  }

  get unreadNotifications(): NotificationItem[] {
    // Fallback to provided notifications list. In a real app, filter by read flag.
    return this.notifications;
  }

  get avatarName(): string {
    return this.email || this.translateKey('navbar.userFallback');
  }

  get avatarUrl(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.avatarName)}`;
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
    this.notifications = this.notifications.map((notification) => ({ ...notification, _localRead: true }));
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

  parseStatusCode(message: string): NotificationStatus {
    const raw = (message || '').toLowerCase();
    const normalized = this.normalize(raw);

    if (normalized.includes('succes') || normalized.includes('success')) {
      return 'success';
    }

    if (
      normalized.includes('erreur') ||
      normalized.includes('echec') ||
      normalized.includes('fail') ||
      normalized.includes('error')
    ) {
      return 'error';
    }

    if (normalized.includes('attente') || normalized.includes('pending') || normalized.includes('en cours')) {
      return 'pending';
    }

    return 'info';
  }

  statusBadgeClass(status: NotificationStatus): string {
    switch (status) {
      case 'success':
        return 'bg-success';
      case 'error':
        return 'bg-danger';
      case 'pending':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

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
    const { currentPassword, newPassword, confirmPassword } = this.changeForm.getRawValue() as {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.changeError = this.translateKey('navbar.changePassword.errors.missingFields');
      this.changeForm.markAllAsTouched();
      return;
    }

    if (newPassword !== confirmPassword) {
      this.changeError = this.translateKey('navbar.changePassword.errors.mismatch');
      return;
    }

    this.changeLoading = true;
    this.auth.changePassword({ oldPassword: currentPassword, newPassword }).subscribe({
      next: (response) => {
        this.changeLoading = false;
        this.changeSuccess = response?.message || this.translateKey('navbar.changePassword.success');
        setTimeout(() => this.modalRef?.close(), 700);
      },
      error: (errorResponse) => {
        this.changeLoading = false;
        this.changeError =
          errorResponse?.error?.message ||
          errorResponse?.message ||
          this.translateKey('navbar.changePassword.errors.generic');
      }
    });
  }

  private translateKey(key: string, params?: Record<string, unknown>): string {
    return this.translation.instant(key, params);
  }

  private normalize(value: string): string {
    if (typeof value.normalize === 'function') {
      return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    return value;
  }
}
