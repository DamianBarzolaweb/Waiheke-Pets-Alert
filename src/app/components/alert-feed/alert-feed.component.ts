import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { alertHeadline, type AlertStatus, type Species } from '../../models/pet-alert.model';
import { RouterLink } from '@angular/router';
import { PetAlertsService } from '../../services/pet-alerts.service';
import { PetCardComponent } from '../pet-card/pet-card.component';

type SpeciesFilter = 'all' | Species;
type StatusFilter = 'all' | AlertStatus;

@Component({
  selector: 'app-alert-feed',
  imports: [PetCardComponent, RouterLink],
  templateUrl: './alert-feed.component.html',
  styleUrl: './alert-feed.component.scss',
})
export class AlertFeedComponent {
  private readonly alertsService = inject(PetAlertsService);
  private readonly route = inject(ActivatedRoute);

  readonly speciesFilter = signal<SpeciesFilter>('all');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchQuery = signal('');
  readonly loadError = this.alertsService.loadError;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const s = params.get('status');
      if (s === 'Lost' || s === 'Sighted') {
        this.statusFilter.set(s);
      } else {
        this.statusFilter.set('all');
      }
    });
  }

  readonly filteredAlerts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const species = this.speciesFilter();
    const status = this.statusFilter();

    return this.alertsService.allAlerts().filter((alert) => {
      if (species !== 'all' && alert.species !== species) {
        return false;
      }
      if (status !== 'all' && alert.status !== status) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = `${alertHeadline(alert)} ${alert.breed} ${alert.location}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  onSpeciesChange(value: string): void {
    this.speciesFilter.set(value as SpeciesFilter);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value as StatusFilter);
  }
}
