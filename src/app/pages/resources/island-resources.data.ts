export interface IslandResourceContact {
  name: string;
  role?: string;
  address?: string;
  phone?: string;
  phoneNote?: string;
  email?: string;
  website?: string;
  websiteLabel?: string;
  hours?: string;
  notes?: string;
}

/** Public contacts for Island resources — verify periodically on provider sites. */
export const WAIHEKE_VETERINARIANS: IslandResourceContact[] = [
  {
    name: 'Vets on Waiheke',
    role: 'Full-service clinic · 24/7 emergencies',
    address: '30 Putiki Road, Ostend',
    phone: '09 372 8387',
    phoneNote: 'Call anytime for emergencies — do not book online in an emergency',
    website: 'https://vetsonwaiheke.co.nz/',
    websiteLabel: 'vetsonwaiheke.co.nz',
    hours: 'Mon–Fri 8am–6pm · Sat 9am–1pm · Sun closed (after-hours on call)',
    notes: 'Wellness, surgery, x-ray, mobile pickup for emergencies, exotic & native bird care.',
  },
  {
    name: 'Pet Connect Vet',
    role: 'In-store & home visits (non-urgent)',
    address: 'Pet Connect, 19 Belgium Street, Ostend',
    phone: '020 4109 6152',
    phoneNote: 'Text preferred',
    email: 'gemma@petconnect.nz',
    website: 'https://www.petconnect.nz/pages/pet-connect-vet',
    websiteLabel: 'petconnect.nz',
    hours: 'By appointment — see booking on Pet Connect site',
    notes: 'Dogs, cats, rabbits, guinea pigs & pet birds. Existing clients: emergency line same number.',
  },
];

export const WAIHEKE_BIRD_RESCUE: IslandResourceContact[] = [
  {
    name: 'Native Bird Rescue',
    role: 'DOC-permitted native bird rescue & rehabilitation (Waiheke)',
    phone: '0204 739 464',
    phoneNote: 'If you find an ill or injured native bird, call first',
    website: 'https://nativebirdrescue.nz/',
    websiteLabel: 'nativebirdrescue.nz',
    notes:
      'Kererū, tūī, kākā, kororā / little blue penguin, and other protected native species. ' +
      'You can also take native birds to Vets on Waiheke (Ostend) — wildlife treatment is at no charge; ' +
      'give your name, phone, and exact location found.',
  },
];
