export type AlertStatus = 'Lost' | 'Sighted';

export type Species = 'dog' | 'cat';

export interface CommunitySighting {
  id: string;
  author: string;
  timeAgo: string;
  body: string;
  thumbUrl?: string;
}

export interface PetAlert {
  id: string;
  /** Vacío en avistamientos cuando el testigo no conoce el nombre. */
  name: string;
  status: AlertStatus;
  species: Species;
  breed: string;
  breedVariant: 'tertiary' | 'secondary';
  location: string;
  /** Approximate coordinates for map pins (Waiheke Island). */
  lat: number;
  lng: number;
  description: string;
  reportedAgo: string;
  imageUrl: string;
  imageAlt: string;
  /** Detalle para pantalla de alerta */
  dateReported?: string;
  lastSeenWindow?: string;
  detailLocation?: string;
  fullDescription?: string;
  sightings?: CommunitySighting[];
}

/** Título para tarjetas y mapas cuando no hay nombre (p. ej. avistamiento). */
export function alertHeadline(a: PetAlert): string {
  if (a.status === 'Sighted' && !(a.name ?? '').trim()) {
    const b = (a.breed ?? '').trim();
    return b && b !== 'Unknown' ? b : 'Sighted pet';
  }
  return (a.name ?? '').trim() || 'Pet';
}
