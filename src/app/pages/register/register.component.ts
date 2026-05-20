import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { apiUrl } from '../../lib/api-url';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Mirrors backend REGISTRATION_EMAIL_ONLY (default true in local run_dev.sh). */
  readonly registrationEmailOnly = signal(true);

  /** 1 form, 2 verify (email code or phone code) */
  readonly step = signal<1 | 2>(1);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly registrationId = signal<string | null>(null);
  readonly verifyChannel = signal<'email' | 'phone'>('email');
  readonly devRegisterHints = signal<{
    code: string;
    whatsappComposeUrl?: string;
  } | null>(null);
  /** After resending signup email (no JWT yet) */
  readonly resendSignupOk = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    nombreCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    whatsapp: [''],
    aceptoTerminos: [false, Validators.requiredTrue],
  });

  readonly codeSignup = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
  ]);

  ngOnInit(): void {
    this.http.get<{ emailOnly: boolean }>(apiUrl('/api/auth/registration-options')).subscribe({
      next: (o) => {
        const emailOnly = o.emailOnly !== false;
        this.registrationEmailOnly.set(emailOnly);
        if (!emailOnly) {
          this.form.controls.email.clearValidators();
          this.form.controls.email.setValidators([Validators.email]);
          this.form.controls.email.updateValueAndValidity();
          this.form.controls.whatsapp.setValidators([Validators.required]);
          this.form.controls.whatsapp.updateValueAndValidity();
        }
      },
      error: () => {
        this.registrationEmailOnly.set(true);
      },
    });
  }

  submitPaso1(ev: Event): void {
    ev.preventDefault();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(this.registrationStep1InvalidMessage());
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    const v = this.form.getRawValue();
    this.auth
      .registerStart({
        username: v.username.trim(),
        password: v.password,
        nombreCompleto: v.nombreCompleto.trim(),
        email: v.email.trim(),
        whatsapp: v.whatsapp.trim(),
        aceptoTerminos: v.aceptoTerminos,
      })
      .subscribe({
        next: (r) => {
          const channel = r.verificationChannel ?? 'email';
          this.verifyChannel.set(channel === 'phone' ? 'phone' : 'email');
          this.registrationId.set(r.registrationId);

          const devHints =
            r.devVerificationCode != null && r.devVerificationCode !== ''
              ? {
                  code: r.devVerificationCode,
                  ...(r.devWhatsappComposeUrl ? { whatsappComposeUrl: r.devWhatsappComposeUrl } : {}),
                }
              : null;
          this.devRegisterHints.set(devHints);

          if (channel === 'phone' && r.skipPhoneOtp) {
            this.submitting.set(true);
            this.auth.registerVerifyPhone(r.registrationId, '').subscribe({
              next: ({ token, user }) => {
                this.auth.applySession(token, user);
                this.submitting.set(false);
                void this.router.navigateByUrl('/');
              },
              error: (e) => this.onVerifyError(e),
            });
            return;
          }

          this.step.set(2);
          this.submitting.set(false);
        },
        error: (e) => {
          this.submitting.set(false);
          this.devRegisterHints.set(null);
          this.error.set(this.registerStartErrorMessage(e));
        },
      });
  }

  submitVerifyCode(ev: Event): void {
    ev.preventDefault();
    if (this.codeSignup.invalid) {
      this.codeSignup.markAsTouched();
      this.error.set(
        this.verifyChannel() === 'email'
          ? 'Enter the 6-digit code from your email.'
          : 'Enter the 6-digit code sent to your phone.',
      );
      return;
    }
    const rid = this.registrationId();
    if (!rid) {
      this.error.set('Sign-up session lost. Start again.');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.auth.registerVerifyPhone(rid, this.codeSignup.value.trim()).subscribe({
      next: ({ token, user }) => {
        this.auth.applySession(token, user);
        this.submitting.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (e) => this.onVerifyError(e),
    });
  }

  resendSignupEmail(): void {
    const rid = this.registrationId();
    if (!rid) {
      this.error.set('Sign-up session lost. Start again.');
      return;
    }
    this.resendSignupOk.set(null);
    this.error.set(null);
    this.auth.registerResendSignupEmail(rid).subscribe({
      next: () =>
        this.resendSignupOk.set(
          'Code resent. If Mailgun is on, check your inbox; otherwise see the server log.',
        ),
      error: (e) => {
        const msg =
          e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
            ? String((e.error as { error?: string }).error || '')
            : '';
        this.error.set(msg || 'Could not resend. Is the backend running?');
      },
    });
  }

  private onVerifyError(e: unknown): void {
    this.submitting.set(false);
    const msg =
      e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
        ? String((e.error as { error?: string }).error || '')
        : '';
    this.error.set(msg || 'Incorrect code.');
  }

  volverPaso1(): void {
    this.step.set(1);
    this.registrationId.set(null);
    this.devRegisterHints.set(null);
    this.error.set(null);
    this.resendSignupOk.set(null);
    this.codeSignup.reset('');
  }

  private registrationStep1InvalidMessage(): string {
    const fc = this.form.controls;
    const parts: string[] = [];
    if (fc.username.invalid) {
      parts.push('username (required, at least 2 characters)');
    }
    if (fc.password.invalid) {
      parts.push('password (required, at least 6 characters)');
    }
    if (fc.nombreCompleto.invalid) {
      parts.push('full name');
    }
    if (fc.email.invalid) {
      parts.push('valid email');
    }
    if (fc.aceptoTerminos.invalid) {
      parts.push('accept the Terms & Conditions and Privacy Policy');
    }
    if (!parts.length) {
      return 'Check the form.';
    }
    return `Missing or invalid: ${parts.join(', ')}.`;
  }

  private registerStartErrorMessage(e: unknown): string {
    const fallback = 'Could not start registration.';
    if (e instanceof HttpErrorResponse) {
      const bodyErr = e.error && typeof e.error === 'object' && e.error !== null && 'error' in e.error;
      if (bodyErr) {
        const m = (e.error as { error?: string }).error;
        if (m && typeof m === 'string') {
          return m;
        }
      }
      if (e.status === 0) {
        return 'Cannot reach server. Is the backend running (e.g. port 5001) and is the Angular dev proxy pointing at the API?';
      }
      if (e.status === 429) {
        return 'Too many attempts. Try again later or restart the server in development.';
      }
      return `HTTP error ${e.status}. Check the backend logs.`;
    }
    return fallback;
  }
}
