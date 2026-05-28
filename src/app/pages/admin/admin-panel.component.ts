import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { alertHeadline } from '../../models/pet-alert.model';
import type { PetAlert } from '../../models/pet-alert.model';
import { AdminAlertsService } from '../../services/admin-alerts.service';
import { PetAlertsService } from '../../services/pet-alerts.service';

@Component({
  selector: 'app-admin-panel',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent implements OnInit {
  private readonly adminAlerts = inject(AdminAlertsService);
  private readonly petAlerts = inject(PetAlertsService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly rows = signal<PetAlert[]>([]);
  readonly selectedId = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    name: [''],
    status: ['Lost' as 'Lost' | 'Sighted', Validators.required],
    species: ['dog' as 'dog' | 'cat', Validators.required],
    breed: [''],
    location: ['', Validators.required],
    lat: [0, Validators.required],
    lng: [0, Validators.required],
    description: ['', Validators.required],
    imageUrl: ['', Validators.required],
    lastSeenWindow: [''],
    fullDescription: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminAlerts.list().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(this.httpMessage(e, 'Could not load alerts.'));
      },
    });
  }

  selectRow(a: PetAlert): void {
    this.selectedId.set(a.id);
    this.success.set(null);
    this.error.set(null);
    this.editForm.reset({
      name: a.name ?? '',
      status: a.status,
      species: a.species,
      breed: a.breed ?? '',
      location: a.location,
      lat: a.lat,
      lng: a.lng,
      description: a.description,
      imageUrl: a.imageUrl,
      lastSeenWindow: a.lastSeenWindow ?? '',
      fullDescription: a.fullDescription ?? a.description,
    });
  }

  clearSelection(): void {
    this.selectedId.set(null);
    this.success.set(null);
  }

  saveEdit(ev: Event): void {
    ev.preventDefault();
    const id = this.selectedId();
    if (!id || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    const v = this.editForm.getRawValue();
    this.adminAlerts
      .update(id, {
        name: v.name.trim(),
        status: v.status,
        species: v.species,
        breed: v.breed.trim(),
        location: v.location.trim(),
        lat: v.lat,
        lng: v.lng,
        description: v.description.trim(),
        imageUrl: v.imageUrl.trim(),
        lastSeenWindow: v.lastSeenWindow.trim() || undefined,
        fullDescription: v.fullDescription.trim() || v.description.trim(),
      })
      .subscribe({
        next: (updated) => {
          this.rows.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
          this.petAlerts.refresh();
          this.saving.set(false);
          this.success.set('Alert updated.');
        },
        error: (e) => {
          this.saving.set(false);
          this.error.set(this.httpMessage(e, 'Could not save changes.'));
        },
      });
  }

  deleteSelected(): void {
    const id = this.selectedId();
    if (!id) {
      return;
    }
    const row = this.rows().find((r) => r.id === id);
    const label = row ? alertHeadline(row) : id;
    if (!confirm(`Delete this alert permanently?\n\n${label}\n(${id})`)) {
      return;
    }
    this.deleting.set(true);
    this.error.set(null);
    this.success.set(null);
    this.adminAlerts.remove(id).subscribe({
      next: () => {
        this.rows.update((list) => list.filter((r) => r.id !== id));
        this.petAlerts.refresh();
        this.clearSelection();
        this.deleting.set(false);
        this.success.set('Alert deleted.');
      },
      error: (e) => {
        this.deleting.set(false);
        this.error.set(this.httpMessage(e, 'Could not delete alert.'));
      },
    });
  }

  headline(a: PetAlert): string {
    return alertHeadline(a);
  }

  private httpMessage(e: unknown, fallback: string): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error as { error?: string } | null;
      if (body?.error) {
        return body.error;
      }
      if (e.status === 403) {
        return 'Admin access required. Log in as damo and try again.';
      }
    }
    return fallback;
  }
}
