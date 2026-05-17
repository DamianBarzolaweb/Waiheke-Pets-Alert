import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import * as L from 'leaflet';
import { patchLeafletIcons } from '../../lib/patch-leaflet-icons';
import type { AlertStatus } from '../../models/pet-alert.model';

export interface LeafletMapMarker {
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  alertId?: string;
  status?: AlertStatus;
}

@Component({
  selector: 'app-leaflet-map',
  templateUrl: './leaflet-map.component.html',
  styleUrl: './leaflet-map.component.scss',
})
export class LeafletMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapRoot', { static: true }) mapRoot!: ElementRef<HTMLDivElement>;

  readonly markers = input<LeafletMapMarker[]>([]);
  readonly zoom = input(13);
  /** Click or drag to choose a single location (e.g. report form). */
  readonly pickMode = input(false);
  /** Current pick position; syncs marker from parent. */
  readonly picked = input<{ lat: number; lng: number } | null>(null);
  readonly pickedChange = output<{ lat: number; lng: number }>();
  /**
   * When false, alert markers are drawn but the camera is not fitted to them
   * (use on forms with pick mode so the view stays on the island).
   */
  readonly fitBoundsToMarkers = input(true);

  private readonly ngZone = inject(NgZone);
  private readonly mapReady = signal(false);

  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private pickLayerGroup: L.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastMarkersSignature = '';
  private lastPickSignature = '';

  constructor() {
    effect(() => {
      const list = this.markers();
      const z = this.zoom();
      if (!this.map || !this.markerLayer) {
        return;
      }
      this.ngZone.runOutsideAngular(() => {
        this.applyMarkers(list, z);
      });
    });

    effect(() => {
      if (!this.mapReady() || !this.map || !this.pickLayerGroup) {
        return;
      }
      const pick = this.pickMode();
      const p = this.picked();
      this.ngZone.runOutsideAngular(() => {
        this.syncPickMarker(pick, p);
      });
    });
  }

  /** Call after the host gets size (e.g. map was hidden) so tiles and bounds are correct. */
  invalidateSize(): void {
    this.ngZone.runOutsideAngular(() => {
      this.map?.invalidateSize({ animate: false });
      requestAnimationFrame(() => this.map?.invalidateSize({ animate: false }));
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      patchLeafletIcons();
      const el = this.mapRoot.nativeElement;
      this.map = L.map(el, {
        scrollWheelZoom: true,
        /** Fewer Angular zone ticks + lighter on low-end devices */
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.map);
      this.markerLayer = L.layerGroup().addTo(this.map);
      this.pickLayerGroup = L.layerGroup().addTo(this.map);
      this.applyMarkers(this.markers(), this.zoom());

      if (!this.fitBoundsToMarkers()) {
        const island: L.LatLngTuple = [-36.788, 175.03];
        this.map.setView(island, this.zoom());
      }

      this.map.on('click', (e: L.LeafletMouseEvent) => {
        if (!this.pickMode()) {
          return;
        }
        this.ngZone.run(() => {
          this.pickedChange.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      });

      // First pick marker paint + mapReady unlocks reactive pick sync.
      this.syncPickMarker(this.pickMode(), this.picked());
    });

    this.mapReady.set(true);

    this.resizeObserver = new ResizeObserver(() => {
      this.ngZone.runOutsideAngular(() => {
        this.map?.invalidateSize({ animate: false });
      });
    });
    this.resizeObserver.observe(this.mapRoot.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    const map = this.map;
    this.map = null;
    this.markerLayer = null;
    this.pickLayerGroup = null;
    this.mapReady.set(false);
    this.lastMarkersSignature = '';
    this.lastPickSignature = '';
    if (map) {
      this.ngZone.runOutsideAngular(() => map.remove());
    }
  }

  /** Recompute tiles + bounds after layout (flex, router outlet, mobile chrome). */
  private flushMapSize(): void {
    const map = this.map;
    if (!map) {
      return;
    }
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    });
  }

  private signatureFor(list: LeafletMapMarker[], z: number): string {
    const parts = list.map(
      (m) =>
        `${m.lat.toFixed(6)},${m.lng.toFixed(6)},${m.alertId ?? ''},${m.status ?? ''},${m.title}`,
    );
    return `${z}|${parts.join('|')}`;
  }

  private applyMarkers(list: LeafletMapMarker[], z: number): void {
    if (!this.map || !this.markerLayer) {
      return;
    }
    const sig = this.signatureFor(list, z);
    if (sig === this.lastMarkersSignature) {
      return;
    }
    this.lastMarkersSignature = sig;

    this.markerLayer.clearLayers();
    const island: L.LatLngTuple = [-36.788, 175.03];
    if (list.length === 0) {
      this.map.setView(island, 12);
      this.flushMapSize();
      return;
    }
    const bounds = L.latLngBounds(list.map((m) => [m.lat, m.lng] as L.LatLngTuple));
    for (const m of list) {
      const marker = L.marker([m.lat, m.lng]);
      const statusLabel = m.status === 'Lost' ? 'Lost pet' : m.status === 'Sighted' ? 'Sighted pet' : '';
      const link = m.alertId
        ? `<p class="map-popup-link"><a href="/alertas/${escapeAttr(m.alertId)}">View alert</a></p>`
        : '';
      marker.bindPopup(
        `<div class="map-popup"><strong>${escapeHtml(m.title)}</strong>` +
          (m.subtitle ? `<br/><span class="map-popup-sub">${escapeHtml(m.subtitle)}</span>` : '') +
          (statusLabel ? `<br/><span class="map-popup-status">${statusLabel}</span>` : '') +
          link +
          `</div>`,
        { maxWidth: 280, className: 'map-popup-wrap' },
      );
      marker.addTo(this.markerLayer);
    }
    if (this.fitBoundsToMarkers()) {
      if (list.length === 1) {
        this.map.setView([list[0].lat, list[0].lng], z);
      } else {
        this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      }
    }
    this.flushMapSize();
  }

  private pickSignature(pick: boolean, p: { lat: number; lng: number } | null): string {
    if (!pick || !p) {
      return `${pick}|`;
    }
    return `${pick}|${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  }

  private syncPickMarker(pick: boolean, p: { lat: number; lng: number } | null): void {
    const group = this.pickLayerGroup;
    const map = this.map;
    if (!group || !map) {
      return;
    }
    const sig = this.pickSignature(pick, p);
    if (sig === this.lastPickSignature) {
      return;
    }
    this.lastPickSignature = sig;

    group.clearLayers();
    if (!pick || p == null) {
      this.flushMapSize();
      return;
    }
    const m = L.marker([p.lat, p.lng], { draggable: true });
    m.on('dragend', () => {
      const ll = m.getLatLng();
      this.ngZone.run(() => this.pickedChange.emit({ lat: ll.lat, lng: ll.lng }));
    });
    m.addTo(group);
    map.panTo([p.lat, p.lng], { animate: true });
    this.flushMapSize();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
