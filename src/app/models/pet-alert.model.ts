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
