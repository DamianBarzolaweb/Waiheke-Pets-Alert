import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { alertHeadline } from '../../models/pet-alert.model';
import { LeafletMapComponent, type LeafletMapMarker } from '../../components/leaflet-map/leaflet-map.component';
import { PetAlertsService } from '../../services/pet-alerts.service';

@Component({
  selector: 'app-map-page',
  imports: [RouterLink, LeafletMapComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
})
export class MapPageComponent {
  private readonly alertsService = inject(PetAlertsService);

  readonly markers = computed((): LeafletMapMarker[] =>
    this.alertsService.allAlerts().map((a) => ({
      lat: a.lat,
      lng: a.lng,
      title: alertHeadline(a),
      subtitle: a.location,
      alertId: a.id,
      status: a.status,
    })),
  );
}
