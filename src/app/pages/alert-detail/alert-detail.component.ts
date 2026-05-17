import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeafletMapComponent, type LeafletMapMarker } from '../../components/leaflet-map/leaflet-map.component';
import { alertHeadline } from '../../models/pet-alert.model';
import { PetAlertsService } from '../../services/pet-alerts.service';

@Component({
  selector: 'app-alert-detail',
  imports: [RouterLink, LeafletMapComponent],
  templateUrl: './alert-detail.component.html',
  styleUrl: './alert-detail.component.scss',
})
export class AlertDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly alertsService = inject(PetAlertsService);

  readonly alertId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });

  readonly loadingAlerts = this.alertsService.loading;

  readonly alert = computed(() => {
    const id = this.alertId();
    return id ? this.alertsService.getById(id) : undefined;
  });

  readonly heroTitle = computed(() => {
    const a = this.alert();
    if (!a) {
      return '';
    }
    if (a.status === 'Lost') {
      return `Finding ${a.name}`;
    }
    const head = alertHeadline(a);
    return head === 'Sighted pet' || !(a.name ?? '').trim() ? head : `Sighted: ${a.name}`;
  });

  readonly mapMarkers = computed((): LeafletMapMarker[] => {
    const a = this.alert();
    if (!a) {
      return [];
    }
    return [{ lat: a.lat, lng: a.lng, title: alertHeadline(a), subtitle: a.location, status: a.status }];
  });
}
