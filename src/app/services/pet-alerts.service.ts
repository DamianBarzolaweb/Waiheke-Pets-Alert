import { Injectable, signal } from '@angular/core';
import type { PetAlert } from '../models/pet-alert.model';

const MOCK_ALERTS: PetAlert[] = [
  {
    id: 'cooper',
    name: 'Cooper',
    status: 'Lost',
    species: 'dog',
    breed: 'Golden Retriever',
    breedVariant: 'tertiary',
    location: 'Oneroa Village near Library',
    lat: -36.7904,
    lng: 175.0101,
    description:
      'Last seen wandering near the library. Wearing a blue collar with a bell. Very friendly but might be scared.',
    reportedAgo: 'Reported 2h ago',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA5-w724no3pTHRKNjR9jIFYKy_KcD9DQvdswQ6eu08GwLY7hOiSAvNKyUknWbSMyUI-anIPE4w5rZ_Ua4b6MSwgcTiSZAl3par7e8_Tji66MQyzXDTROZbVtJmtQAJlTOCO2y7k6qAlTYXamfpZlm6iv2VnUFBT28qXG_OBWjSU93RdXtY8nDTJYzForn8ftuzDH3Xvbei0l4ohpOVZg6IRPsbAAByq5MIpXFInkOVuH0ZxJksREfWKlMzRVs1fGeavonuE0x7k_Q',
    imageAlt:
      'Golden retriever dog sitting in tall grass on a Waiheke hillside overlooking the ocean at sunset',
    dateReported: '10 Apr 2026, 2:22 pm',
    lastSeenWindow: 'Last seen near Oneroa Library — west side steps',
    detailLocation: 'Oneroa Village, Waiheke Island',
    fullDescription:
      'Cooper slipped his lead near the library green. He is wearing a blue collar with a small silver bell and an engraved tag. He is gentle with people but may bolt if startled by loud traffic. Please avoid chasing; call softly and offer treats if you see him.',
    sightings: [
      {
        id: 's1',
        author: 'Alex T.',
        timeAgo: '45m ago',
        body: 'Thought I saw a similar dog near the ferry queue — couldn’t confirm the collar.',
      },
      {
        id: 's2',
        author: 'Moana K.',
        timeAgo: '2h ago',
        body: 'Will keep treats in my pack on the walk home tonight.',
      },
    ],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    status: 'Sighted',
    species: 'cat',
    breed: 'Bombay Mix',
    breedVariant: 'secondary',
    location: 'Palm Beach Reserve',
    lat: -36.7971,
    lng: 175.067,
    description:
      'Found taking shelter under a bench. No collar found. Safe in our backyard now, please contact to identify.',
    reportedAgo: 'Reported 5h ago',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCNF4NFY76O2jqeOp474EHsd7_1ZJIXcsYgonqpfm6c_7O1xQRmA53bVvG4tKM10E3SQznWKwyQFB-pnd1B6ZR9Fn_n-8WwRalkIMkakP_LcZ78-8cykZhTqCEnFhHw3ntVcD32CQZ1IeBVfKpq8QAUV1qoZaTXABt_QZdbXzS0JQmaUCsL4foDY8-bsiJ8vs_sz9QWV5STMaBudoKp2RQkGw-SAj1mXVq1We5NfxHfNnhmpIxbD8Lo1EdYhJI4Bsv8SXnX6ELHwVg',
    imageAlt:
      'Sleek black cat with yellow eyes resting on a weathered wooden deck with native New Zealand ferns in background',
    dateReported: '10 Apr 2026, 9:10 am',
    lastSeenWindow: 'Sheltering under the northern picnic bench',
    detailLocation: 'Palm Beach Reserve, Waiheke Island',
    fullDescription:
      'Small black cat with bright amber eyes. No collar. Very calm indoors. We can hold safely while an owner comes forward — please message with identifying details only.',
    sightings: [
      {
        id: 's3',
        author: 'Sam R.',
        timeAgo: '3h ago',
        body: 'Posted to the local FB group as well — fingers crossed.',
      },
    ],
  },
  {
    id: 'pip',
    name: 'Pip',
    status: 'Lost',
    species: 'dog',
    breed: 'Jack Russell',
    breedVariant: 'tertiary',
    location: 'Little Oneroa Beach',
    lat: -36.7836,
    lng: 175.0198,
    description:
      'Ran off chasing a bird near the playground. Wearing a red harness. Very fast, please do not chase.',
    reportedAgo: 'Reported 8h ago',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD_YKQWPC_z2GtcpCA2ZW1rsBRA4MFltmnUE0l61fMwLZTlalnpi6IrntgZACc7iJrhmUFS2ofp88GdRov50wjTHZ-cWDRWH89V72LeIKmHfVEudLHyi3lVPMk9dTvklz3_pVFkMJfKM_UN77ARjoJ2-SpGJMg4hx-F4e5Yo4bftr1Sfqd8JQYDwDPxmkTGUA69KQZ-i9UfaxyfRsmRelp4JeHkcZnIhrPicNtAdMosnsZbPU3ApoCkbQPR3WrYVTCWdJfJmMuoYGE',
    imageAlt:
      'Small white terrier mix looking curious on a gravel path near a coastal beach with turquoise water',
    dateReported: '9 Apr 2026, 6:40 pm',
    lastSeenWindow: 'Playground end of Little Oneroa — red harness',
    detailLocation: 'Little Oneroa Beach, Waiheke Island',
    fullDescription:
      'Pip is quick and will bolt if pursued. Please call from a distance and crouch down — he responds to a two-note whistle. Red harness with a small Waiheke tag.',
    sightings: [
      {
        id: 's4',
        author: 'Jordan P.',
        timeAgo: '6h ago',
        body: 'Keeping an eye out on my evening run route.',
      },
      {
        id: 's5',
        author: 'Ella M.',
        timeAgo: '7h ago',
        body: 'Will check the coastal track cameras tonight.',
      },
    ],
  },
  {
    id: 'shadow',
    name: 'Shadow',
    status: 'Sighted',
    species: 'dog',
    breed: 'Border Collie',
    breedVariant: 'secondary',
    location: 'Surfdale Track',
    lat: -36.8065,
    lng: 175.042,
    description:
      "Found wandering the track alone. Has a microchip tag but we couldn't read the phone number. Currently safe at the vet.",
    reportedAgo: 'Reported 12h ago',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCucwKKRqHZrgBJ_yjokJfTI0Q5uaoQbJSPEe0rk-GU5XR9l58jACmdsCFIZzN9JeD7RX7RXLeAIh3UCGV7Yn8_C2CIwCePsYfW19u7zOQ0XvjPNJC4JQMqAKdB3oLWBmlasqSz5VnDXGSXOOKFiaPvE1CdVr7iGGQTak-qmD5joMQHtFDhVOOuq6XTlhYnHAeTXJ9DUwXc579QyTYMECSj34VapNkMdQPq1-tVqt8PK2PweD634ma-GFIx7BmEqbNJN9Zu8LSEbcw',
    imageAlt:
      'Fluffy border collie running on a lush green field with scattered coastal shrubs and overcast sky',
    dateReported: '9 Apr 2026, 11:05 am',
    lastSeenWindow: 'Mid-track between Surfdale and Ostend junction',
    detailLocation: 'Surfdale Track, Waiheke Island',
    fullDescription:
      'Border collie, medium coat, microchip tag present. Currently with the island vet for a chip scan and temporary care. Proof of ownership will be required for release.',
    sightings: [
      {
        id: 's6',
        author: 'Vet clinic',
        timeAgo: '11h ago',
        body: 'Stable, hydrated, and resting. Thank you to the finder.',
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class PetAlertsService {
  private readonly _alerts = signal<PetAlert[]>(MOCK_ALERTS);

  readonly allAlerts = this._alerts.asReadonly();

  getById(id: string): PetAlert | undefined {
    return this._alerts().find((a) => a.id === id);
  }
}
