import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PetAlert } from '../../models/pet-alert.model';

@Component({
  selector: 'app-pet-card',
  imports: [RouterLink],
  templateUrl: './pet-card.component.html',
  styleUrl: './pet-card.component.scss',
})
export class PetCardComponent {
  readonly alert = input.required<PetAlert>();
}
