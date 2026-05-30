import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WAIHEKE_BIRD_RESCUE, WAIHEKE_VETERINARIANS } from './island-resources.data';

@Component({
  selector: 'app-resources',
  imports: [RouterLink],
  templateUrl: './resources.component.html',
  styleUrl: './resources.component.scss',
})
export class ResourcesComponent {
  readonly veterinarians = WAIHEKE_VETERINARIANS;
  readonly birdRescue = WAIHEKE_BIRD_RESCUE;

  telHref(phone: string | undefined): string | null {
    if (!phone) {
      return null;
    }
    const digits = phone.replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    return digits.startsWith('0') ? `tel:+64${digits.slice(1)}` : `tel:+${digits}`;
  }

  mailHref(email: string | undefined): string | null {
    return email ? `mailto:${email}` : null;
  }
}
