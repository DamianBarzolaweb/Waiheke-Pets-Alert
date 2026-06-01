import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../lib/http-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly step = signal<1 | 2>(1);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly devCode = signal<string | null>(null);
  /** What the user typed (email or username). */
  readonly identifierSent = signal('');
  /** Email where the code was sent (from API). */
  readonly emailDest = signal('');

  readonly emailForm = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly resetForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  sendCode(ev: Event): void {
    ev.preventDefault();
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.devCode.set(null);
    this.submitting.set(true);
    const identifier = this.emailForm.getRawValue().identifier.trim();
    this.auth.forgotPassword(identifier).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.identifierSent.set(identifier);
        this.emailDest.set(res.email ?? identifier);
        this.step.set(2);
        this.success.set(res.message);
        if (res.devResetCode) {
          this.devCode.set(res.devResetCode);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err, 'Could not send reset email. Try again.'));
      },
    });
  }

  resendCode(): void {
    const id = this.identifierSent();
    if (!id) {
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.auth.forgotPassword(id).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.success.set(res.message);
        if (res.devResetCode) {
          this.devCode.set(res.devResetCode);
        }
        if (res.email) {
          this.emailDest.set(res.email);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err, 'Could not resend code.'));
      },
    });
  }

  resetPassword(ev: Event): void {
    ev.preventDefault();
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const v = this.resetForm.getRawValue();
    if (v.password !== v.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.auth.resetPassword(this.identifierSent(), v.code.trim(), v.password).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.success.set(res.message);
        this.resetForm.reset();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err, 'Could not reset password.'));
      },
    });
  }

  backToEmail(): void {
    this.step.set(1);
    this.error.set(null);
    this.success.set(null);
    this.devCode.set(null);
  }
}
