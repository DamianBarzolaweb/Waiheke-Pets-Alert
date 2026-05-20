import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { apiUrl } from '../lib/api-url';
import type { PetAlert } from '../models/pet-alert.model';

export interface ReportPayload {
  /** Only used for "lost" reports; empty for "sighted". */
  petName: string;
  breed?: string;
  kind: 'lost' | 'sighted';
  description: string;
  seenDate?: string;
  seenTime?: string;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class PetAlertsService {
  private readonly http = inject(HttpClient);

  private readonly _alerts = signal<PetAlert[]>([]);
  readonly allAlerts = this._alerts.asReadonly();

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.http.get<PetAlert[]>(apiUrl('/api/alerts')).subscribe({
      next: (rows) => {
        this._alerts.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load alerts. Is the API server running?');
        this._alerts.set([]);
        this.loading.set(false);
      },
    });
  }

  getById(id: string): PetAlert | undefined {
    return this._alerts().find((a) => a.id === id);
  }

  /** Create alert from report form (Latinos-style POST). */
  submitReport(payload: ReportPayload): Observable<PetAlert> {
    return this.http
      .post<PetAlert>(apiUrl('/api/alerts'), {
        petName: payload.petName,
        breed: payload.breed ?? '',
        kind: payload.kind,
        description: payload.description,
        seenDate: payload.seenDate ?? '',
        seenTime: payload.seenTime ?? '',
        lat: payload.lat,
        lng: payload.lng,
      })
      .pipe(tap((created) => this._alerts.update((list) => [created, ...list])));
  }
}
