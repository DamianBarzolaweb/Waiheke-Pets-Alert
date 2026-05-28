import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { apiUrl } from '../lib/api-url';
import type { CommunitySighting, PetAlert } from '../models/pet-alert.model';

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

  fetchById(id: string): Observable<PetAlert> {
    return this.http.get<PetAlert>(apiUrl(`/api/alerts/${encodeURIComponent(id)}`));
  }

  upsertInCache(alert: PetAlert): void {
    this._alerts.update((list) => {
      const i = list.findIndex((a) => a.id === alert.id);
      if (i >= 0) {
        const next = [...list];
        next[i] = alert;
        return next;
      }
      return [alert, ...list];
    });
  }

  postComment(alertId: string, body: string, parentId?: string): Observable<CommunitySighting> {
    return this.http.post<CommunitySighting>(apiUrl(`/api/alerts/${encodeURIComponent(alertId)}/comments`), {
      body,
      parentId: parentId ?? null,
    });
  }

  /** Create alert from report form (multipart + photo). */
  submitReport(payload: ReportPayload, photo: File): Observable<PetAlert> {
    const fd = new FormData();
    fd.append('photo', photo, photo.name);
    fd.append('kind', payload.kind);
    fd.append('petName', payload.petName);
    fd.append('breed', payload.breed ?? '');
    fd.append('description', payload.description);
    fd.append('seenDate', payload.seenDate ?? '');
    fd.append('seenTime', payload.seenTime ?? '');
    fd.append('lat', String(payload.lat));
    fd.append('lng', String(payload.lng));
    return this.http
      .post<PetAlert>(apiUrl('/api/alerts'), fd)
      .pipe(tap((created) => this._alerts.update((list) => [created, ...list])));
  }
}
