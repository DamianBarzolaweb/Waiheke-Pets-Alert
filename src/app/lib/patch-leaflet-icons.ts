import * as L from 'leaflet';

let patched = false;

/** Leaflet default marker images break under bundlers; icons are copied to `/leaflet/` via angular.json assets. */
export function patchLeafletIcons(): void {
  if (patched) {
    return;
  }
  patched = true;
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: '/leaflet/marker-icon.png',
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  });
}
