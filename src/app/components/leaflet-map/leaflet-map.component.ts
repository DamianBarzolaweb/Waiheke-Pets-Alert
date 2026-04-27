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

  private readonly ngZone = inject(NgZone);

  private map: L.Map | null = null;
  private markerLayer: L.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastMarkersSignature = '';

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
      this.applyMarkers(this.markers(), this.zoom());
    });

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
    this.lastMarkersSignature = '';
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
    if (list.length === 1) {
      this.map.setView([list[0].lat, list[0].lng], z);
    } else {
      this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    }
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
