import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiUrl } from '../lib/api-url';
import type { PetAlert } from '../models/pet-alert.model';

export type AdminAlertUpdate = Partial<
  Pick<
    PetAlert,
    | 'name'
    | 'status'
    | 'species'
    | 'breed'
    | 'breedVariant'
    | 'location'
    | 'lat'
    | 'lng'
    | 'description'
    | 'imageUrl'
    | 'imageAlt'
    | 'lastSeenWindow'
    | 'detailLocation'
    | 'fullDescription'
  >
>;

@Injectable({ providedIn: 'root' })
export class AdminAlertsService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<PetAlert[]>(apiUrl('/api/admin/alerts'));
  }

  update(id: string, body: AdminAlertUpdate) {
    return this.http.patch<PetAlert>(apiUrl(`/api/admin/alerts/${id}`), body);
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean; id: string }>(apiUrl(`/api/admin/alerts/${id}`));
  }
}
