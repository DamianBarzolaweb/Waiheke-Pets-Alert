import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgClass } from '@angular/common';
import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LeafletMapComponent } from '../../components/leaflet-map/leaflet-map.component';
import { alertHeadline } from '../../models/pet-alert.model';
import { PetAlertsService } from '../../services/pet-alerts.service';

@Component({
  selector: 'app-report',
  imports: [ReactiveFormsModule, RouterLink, NgClass, DecimalPipe, LeafletMapComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
})
export class ReportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly petAlerts = inject(PetAlertsService);
  private readonly router = inject(Router);

  @ViewChild('reportMap') private reportMapRef?: LeafletMapComponent;

  readonly kind = signal<'lost' | 'sighted'>('lost');
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly pickedPin = signal<{ lat: number; lng: number } | null>(null);

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

  /** Scroll to map and invalidate tile size (after layout or from button). */
  focusPickMap(): void {
    document.getElementById('report-map-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => this.reportMapRef?.invalidateSize(), 380);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
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
      .submitReport({
        petName: this.kind() === 'lost' ? v.petName : '',
        breed: v.breed,
        kind: this.kind(),
        description: v.description,
        seenDate: v.seenDate,
        seenTime: v.seenTime,
        lat: pin.lat,
        lng: pin.lng,
      })
      .subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.form.reset();
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
          this.submitError.set(
            'Could not submit the report. Try again or check that the API is running.',
          );
        },
      });
  }
}
