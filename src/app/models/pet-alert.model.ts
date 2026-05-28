export type AlertStatus = 'Lost' | 'Sighted';

export type Species = 'dog' | 'cat';

export interface CommunitySighting {
  id: string;
  author: string;
  timeAgo: string;
  body: string;
  thumbUrl?: string;
  /** Set when this is a reply to another community post. */
  parentId?: string | null;
}

export interface PetAlert {
  id: string;
  /** Empty for sightings when the witness does not know the name. */
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
  /** Extra fields for alert detail screen */
  dateReported?: string;
  lastSeenWindow?: string;
  detailLocation?: string;
  fullDescription?: string;
  sightings?: CommunitySighting[];
}

/** Headline for cards and map when there is no name (e.g. sighting). */
export function alertHeadline(a: PetAlert): string {
  if (a.status === 'Sighted' && !(a.name ?? '').trim()) {
    const b = (a.breed ?? '').trim();
    return b && b !== 'Unknown' ? b : 'Sighted pet';
  }
  return (a.name ?? '').trim() || 'Pet';
}
