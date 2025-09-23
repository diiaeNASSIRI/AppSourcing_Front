import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { TranslationService } from '../../config/i18n/translation.service';
import { AuthService } from '../../my-service/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loading = false;
  error: string | null = null;
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  private modalRef?: NgbModalRef;
  private lastLoginPassword: string = '';

  // Change password modal form
  changeForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });
  changeError: string | null = null;
  changeSuccess: string | null = null;

  @ViewChild('changePwdTpl') changePwdTpl!: TemplateRef<any>;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private modal: NgbModal,
    private translation: TranslationService
  ) {}

  ngOnInit(): void {
    if (this.auth.getToken()) {
      this.router.navigate(['/dashboard']);
    }
  }

  submit(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { email, password } = this.form.getRawValue() as { email: string; password: string };
    this.lastLoginPassword = password;
    this.auth.login({ email, password }).subscribe({
      next: (res) => {
        this.loading = false;
        if ((res as any)?.mustChangePassword) {
          this.openChangePasswordModal();
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('[LoginComponent] Auth failed', err);
        const backendMsg = err?.error?.message || err?.message;
        this.error = backendMsg || this.translateKey('login.errors.authentication');
      },
    });
  }

  openChangePasswordModal(): void {
    this.changeError = null;
    this.changeSuccess = null;
    this.changeForm.reset();
    this.modalRef = this.modal.open(this.changePwdTpl, { centered: true, backdrop: 'static', keyboard: false });
  }

  submitChangePassword(): void {
    this.changeError = null;
    this.changeSuccess = null;
    const { newPassword, confirmPassword } = this.changeForm.getRawValue() as { newPassword: string; confirmPassword: string };
    if (!newPassword || !confirmPassword) {
      this.changeError = this.translateKey('login.changePassword.errors.missing');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.changeError = this.translateKey('login.changePassword.errors.mismatch');
      return;
    }
    this.auth.changePassword({ oldPassword: this.lastLoginPassword, newPassword }).subscribe({
      next: () => {
        // Keep session and go directly to dashboard
        this.changeSuccess = this.translateKey('login.changePassword.success');
        setTimeout(() => {
          this.modalRef?.close();
          this.router.navigate(['/dashboard']);
        }, 700);
      },
      error: (err) => {
        console.error('[LoginComponent] Change password failed', err);
        const backendMsg = err?.error?.message || err?.message;
        this.changeError = backendMsg || this.translateKey('login.changePassword.errors.generic');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  visibilityText(isVisible: boolean): string {
    return this.translateKey(isVisible ? 'common.actions.hide' : 'common.actions.show');
  }

  visibilityAriaLabel(isVisible: boolean): string {
    return this.translateKey(isVisible ? 'common.actions.hidePassword' : 'common.actions.showPassword');
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  private translateKey(key: string, params?: Record<string, unknown>): string {
    return this.translation.instant(key, params);
  }
}
