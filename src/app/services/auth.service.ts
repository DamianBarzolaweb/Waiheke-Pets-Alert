import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { apiUrl } from '../lib/api-url';
import type { AuthUser } from '../models/auth-user.model';

const TOKEN_KEY = 'wpa_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.esAdmin === true);
  /** Name shown in the header (full name, else username). */
  readonly displayName = computed(() => {
    const u = this._user();
    if (!u) return '';
    const name = (u.nombreCompleto || '').trim();
    return name || u.username;
  });

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      return;
    }
    this.http.get<AuthUser>(apiUrl('/api/auth/me')).subscribe({
      next: (u) => this._user.set(u),
      error: () => {
        localStorage.removeItem(TOKEN_KEY);
        this._user.set(null);
      },
    });
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._user.set(null);
  }

  login(username: string, password: string) {
    return this.http.post<{ token: string; user: AuthUser }>(apiUrl('/api/auth/login'), {
      username,
      password,
    });
  }

  applySession(token: string, user: AuthUser): void {
    this.setToken(token);
    this._user.set(user);
  }

  logout(): void {
    this.clearToken();
    void this.router.navigateByUrl('/');
  }

  registerStart(body: {
    username: string;
    password: string;
    nombreCompleto: string;
    email: string;
    whatsapp: string;
    aceptoTerminos: boolean;
  }) {
    return this.http.post<{
      registrationId: string;
      message: string;
      /** Email code (default) or phone OTP when REGISTRATION_EMAIL_ONLY=0 and Twilio path */
      verificationChannel?: 'email' | 'phone';
      skipPhoneOtp?: boolean;
      devVerificationCode?: string;
      devWhatsappComposeUrl?: string;
    }>(apiUrl('/api/auth/register/start'), body);
  }

  registerVerifyPhone(registrationId: string, code: string) {
    return this.http.post<{
      token: string;
      user: AuthUser;
      needsEmailVerification: boolean;
    }>(apiUrl('/api/auth/register/verify-phone'), { registrationId, code });
  }

  registerResendSignupEmail(registrationId: string) {
    return this.http.post<{ ok?: boolean }>(apiUrl('/api/auth/register/resend-email-code'), {
      registrationId,
    });
  }

  verifyEmail(code: string) {
    return this.http.post<{ token: string; user: AuthUser }>(apiUrl('/api/auth/verify-email'), {
      code,
    });
  }

  resendEmail() {
    return this.http.post<{ ok: boolean }>(apiUrl('/api/auth/resend-email'), {});
  }

  forgotPassword(identifier: string) {
    return this.http.post<{ ok: boolean; message: string; email?: string; devResetCode?: string }>(
      apiUrl('/api/auth/forgot-password'),
      { identifier, email: identifier },
    );
  }

  resetPassword(identifier: string, code: string, password: string) {
    return this.http.post<{ ok: boolean; message: string }>(apiUrl('/api/auth/reset-password'), {
      identifier,
      email: identifier,
      code,
      password,
    });
  }

  updateProfile(body: {
    nombreCompleto?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    return this.http.patch<{ token: string; user: AuthUser }>(apiUrl('/api/auth/me'), body);
  }
}
