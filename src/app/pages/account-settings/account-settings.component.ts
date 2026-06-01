import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../lib/http-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account-settings',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.scss',
})
export class AccountSettingsComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly userEmail = computed(() => this.auth.user()?.email ?? '—');
  readonly username = computed(() => this.auth.user()?.username ?? '');

  readonly profileForm = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(2)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const u = this.auth.user();
      if (u) {
        this.profileForm.patchValue({ nombreCompleto: u.nombreCompleto || '' }, { emitEvent: false });
      }
    });
  }

  saveProfile(ev: Event): void {
    ev.preventDefault();
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.savingProfile.set(true);
    this.auth
      .updateProfile({ nombreCompleto: this.profileForm.getRawValue().nombreCompleto.trim() })
      .subscribe({
        next: ({ token, user }) => {
          this.auth.applySession(token, user);
          this.savingProfile.set(false);
          this.success.set('Display name saved.');
        },
        error: (err) => {
          this.savingProfile.set(false);
          this.error.set(apiErrorMessage(err, 'Could not save display name.'));
        },
      });
  }

  savePassword(ev: Event): void {
    ev.preventDefault();
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const v = this.passwordForm.getRawValue();
    if (v.newPassword !== v.confirmPassword) {
      this.error.set('New passwords do not match.');
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.savingPassword.set(true);
    this.auth
      .updateProfile({
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      })
      .subscribe({
        next: ({ token, user }) => {
          this.auth.applySession(token, user);
          this.savingPassword.set(false);
          this.success.set('Password updated.');
          this.passwordForm.reset();
        },
        error: (err) => {
          this.savingPassword.set(false);
          this.error.set(apiErrorMessage(err, 'Could not update password.'));
        },
      });
  }
}
