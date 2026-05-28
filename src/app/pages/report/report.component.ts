import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgClass } from '@angular/common';
import { ElementRef } from '@angular/core';
import { Component, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LeafletMapComponent } from '../../components/leaflet-map/leaflet-map.component';
import { alertHeadline } from '../../models/pet-alert.model';
import { PetAlertsService } from '../../services/pet-alerts.service';

const MAX_PHOTO_MB = 8;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Component({
  selector: 'app-report',
  imports: [ReactiveFormsModule, RouterLink, NgClass, DecimalPipe, LeafletMapComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
})
export class ReportComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly petAlerts = inject(PetAlertsService);
  private readonly router = inject(Router);

  @ViewChild('reportMap') private reportMapRef?: LeafletMapComponent;
  @ViewChild('photoInput') private photoInputRef?: ElementRef<HTMLInputElement>;

  readonly kind = signal<'lost' | 'sighted'>('lost');
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly pickedPin = signal<{ lat: number; lng: number } | null>(null);
  readonly selectedPhoto = signal<File | null>(null);
  readonly photoPreviewUrl = signal<string | null>(null);
  readonly photoDragOver = signal(false);

  readonly contextMarkers = computed(() =>
    this.petAlerts.allAlerts().map((a) => ({
      lat: a.lat,
      lng: a.lng,
      title: alertHeadline(a),
      subtitle: a.location,
      alertId: a.id,
      status: a.status,
    })),
  );

  readonly form = this.fb.nonNullable.group({
    petName: ['', Validators.required],
    breed: [''],
    seenDate: [''],
    seenTime: [''],
    description: ['', Validators.required],
  });

  ngOnDestroy(): void {
    this.revokePreview();
  }

  setKind(next: 'lost' | 'sighted'): void {
    this.kind.set(next);
    const nameCtrl = this.form.controls.petName;
    if (next === 'sighted') {
      nameCtrl.clearValidators();
      nameCtrl.setValue('');
    } else {
      nameCtrl.setValidators(Validators.required);
    }
    nameCtrl.updateValueAndValidity({ emitEvent: false });
  }

  onPicked(coords: { lat: number; lng: number }): void {
    this.pickedPin.set(coords);
  }

  focusPickMap(): void {
    document.getElementById('report-map-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => this.reportMapRef?.invalidateSize(), 380);
  }

  openPhotoPicker(): void {
    this.photoInputRef?.nativeElement.click();
  }

  onPhotoSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setPhotoFile(file);
    }
    input.value = '';
  }

  onPhotoDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.photoDragOver.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file) {
      this.setPhotoFile(file);
    }
  }

  onPhotoDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.photoDragOver.set(true);
  }

  onPhotoDragLeave(): void {
    this.photoDragOver.set(false);
  }

  clearPhoto(): void {
    this.revokePreview();
    this.selectedPhoto.set(null);
  }

  private setPhotoFile(file: File): void {
    this.submitError.set(null);
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      this.submitError.set('Photo must be JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      this.submitError.set(`Photo must be under ${MAX_PHOTO_MB} MB.`);
      return;
    }
    this.revokePreview();
    this.selectedPhoto.set(file);
    this.photoPreviewUrl.set(URL.createObjectURL(file));
  }

  private revokePreview(): void {
    const url = this.photoPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.photoPreviewUrl.set(null);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const photo = this.selectedPhoto();
    if (!photo) {
      this.submitError.set('Please add at least one photo.');
      return;
    }
    if (!this.pickedPin()) {
      this.submitError.set('Pick a spot on the map (tap the map or drag the pin).');
      void this.focusPickMap();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitError.set(null);
    this.submitting.set(true);
    const v = this.form.getRawValue();
    const pin = this.pickedPin()!;
    this.petAlerts
      .submitReport(
        {
          petName: this.kind() === 'lost' ? v.petName : '',
          breed: v.breed,
          kind: this.kind(),
          description: v.description,
          seenDate: v.seenDate,
          seenTime: v.seenTime,
          lat: pin.lat,
          lng: pin.lng,
        },
        photo,
      )
      .subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.form.reset();
          this.clearPhoto();
          this.pickedPin.set(null);
          this.kind.set('lost');
          const nameCtrl = this.form.controls.petName;
          nameCtrl.setValidators(Validators.required);
          nameCtrl.updateValueAndValidity({ emitEvent: false });
          void this.router.navigate(['/alertas', created.id]);
        },
        error: (err) => {
          this.submitting.set(false);
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.submitError.set('You must be logged in to report a pet.');
            void this.router.navigate(['/login'], { queryParams: { returnUrl: '/reportar' } });
            return;
          }
          const msg =
            err instanceof HttpErrorResponse && err.error && typeof err.error === 'object'
              ? String((err.error as { error?: string }).error || '')
              : '';
          this.submitError.set(
            msg || 'Could not submit the report. Try again or check that the API is running.',
          );
        },
      });
  }
}
