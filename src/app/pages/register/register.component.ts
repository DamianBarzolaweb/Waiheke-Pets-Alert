import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import type { AuthUser } from '../../models/auth-user.model';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** 1 datos, 2 código WhatsApp, 3 código email */
  readonly step = signal<1 | 2 | 3>(1);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly registrationId = signal<string | null>(null);
  readonly devRegisterHints = signal<{
    code: string;
    whatsappComposeUrl: string;
  } | null>(null);
  readonly needsEmail = signal(false);
  /** Confirmación tras reenvío de código de email */
  readonly resendEmailOk = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    nombreCompleto: ['', [Validators.required]],
    email: [''],
    whatsapp: ['', [Validators.required]],
    aceptoTerminos: [false, Validators.requiredTrue],
  });

  readonly codePhone = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
  ]);

  readonly codeEmail = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
  ]);

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
          this.registrationId.set(r.registrationId);
          if (r.skipPhoneOtp) {
            this.submitting.set(true);
            this.auth.registerVerifyPhone(r.registrationId, '').subscribe({
              next: (res) => this.onPhoneVerified(res),
              error: (e) => this.onPhoneVerifyError(e),
            });
            return;
          }
          if (r.devVerificationCode && r.devWhatsappComposeUrl) {
            this.devRegisterHints.set({
              code: r.devVerificationCode,
              whatsappComposeUrl: r.devWhatsappComposeUrl,
            });
          } else {
            this.devRegisterHints.set(null);
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

  submitPaso2(ev: Event): void {
    ev.preventDefault();
    if (this.codePhone.invalid) {
      this.codePhone.markAsTouched();
      this.error.set('Ingresá los 6 dígitos del código de WhatsApp.');
      return;
    }
    const rid = this.registrationId();
    if (!rid) {
      this.error.set('Sesión de registro perdida. Empezá de nuevo.');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.auth.registerVerifyPhone(rid, this.codePhone.value.trim()).subscribe({
      next: (res) => this.onPhoneVerified(res),
      error: (e) => this.onPhoneVerifyError(e),
    });
  }

  submitPaso3(ev: Event): void {
    ev.preventDefault();
    if (this.codeEmail.invalid) {
      this.codeEmail.markAsTouched();
      this.error.set('Ingresá el código de 6 dígitos que enviamos al email.');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.auth.verifyEmail(this.codeEmail.value.trim()).subscribe({
      next: ({ token, user }) => {
        this.auth.applySession(token, user);
        this.submitting.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (e) => {
        this.submitting.set(false);
        const msg = e?.error?.error ?? 'Código incorrecto.';
        this.error.set(msg);
      },
    });
  }

  resendEmail(): void {
    this.resendEmailOk.set(null);
    this.error.set(null);
    this.auth.resendEmail().subscribe({
      next: () =>
        this.resendEmailOk.set(
          'Listo. Si Mailgun está activo, revisá el correo. Si no, el código nuevo sale en la consola del servidor.',
        ),
      error: (e) => {
        const msg =
          e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
            ? String((e.error as { error?: string }).error || '')
            : '';
        this.error.set(msg || 'No se pudo reenviar el email. ¿Sesión válida y backend en marcha?');
      },
    });
  }

  private onPhoneVerified(res: {
    token: string;
    user: AuthUser;
    needsEmailVerification: boolean;
  }): void {
    this.auth.applySession(res.token, res.user);
    this.submitting.set(false);
    if (res.needsEmailVerification) {
      this.needsEmail.set(true);
      this.step.set(3);
    } else {
      void this.router.navigateByUrl('/');
    }
  }

  private onPhoneVerifyError(e: unknown): void {
    this.submitting.set(false);
    const msg =
      e instanceof HttpErrorResponse && e.error && typeof e.error === 'object' && 'error' in e.error
        ? String((e.error as { error?: string }).error || '')
        : '';
    this.error.set(msg || 'Código incorrecto.');
  }

  volverPaso1(): void {
    this.step.set(1);
    this.registrationId.set(null);
    this.devRegisterHints.set(null);
    this.error.set(null);
    this.resendEmailOk.set(null);
  }

  private registrationStep1InvalidMessage(): string {
    const fc = this.form.controls;
    const parts: string[] = [];
    if (fc.username.invalid) {
      parts.push('usuario (obligatorio, mínimo 2 caracteres)');
    }
    if (fc.password.invalid) {
      parts.push('contraseña (obligatorio, mínimo 6 caracteres)');
    }
    if (fc.nombreCompleto.invalid) {
      parts.push('nombre completo');
    }
    if (fc.whatsapp.invalid) {
      parts.push('WhatsApp en formato internacional (+64… o +54 9…)');
    }
    if (fc.aceptoTerminos.invalid) {
      parts.push('aceptar términos y condiciones');
    }
    if (!parts.length) {
      return 'Revisá el formulario.';
    }
    return `Falta o hay error en: ${parts.join(', ')}.`;
  }

  private registerStartErrorMessage(e: unknown): string {
    const fallback =
      'No se pudo iniciar el registro.';
    if (e instanceof HttpErrorResponse) {
      const bodyErr = e.error && typeof e.error === 'object' && e.error !== null && 'error' in e.error;
      if (bodyErr) {
        const m = (e.error as { error?: string }).error;
        if (m && typeof m === 'string') {
          return m;
        }
      }
      if (e.status === 0) {
        return 'Sin conexión con el servidor. ¿Está el backend en marcha (p. ej. puerto 5001) y el proxy de Angular apuntando al API?';
      }
      if (e.status === 429) {
        return 'Demasiados intentos. Probá dentro de una hora o reiniciá el servidor en desarrollo.';
      }
      return `Fallo HTTP ${e.status}. Revisá la consola del backend.`;
    }
    return fallback;
  }
}
