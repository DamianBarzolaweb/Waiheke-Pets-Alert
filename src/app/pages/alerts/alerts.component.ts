import { Component } from '@angular/core';
import { AlertFeedComponent } from '../../components/alert-feed/alert-feed.component';

@Component({
  selector: 'app-alerts',
  imports: [AlertFeedComponent],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
})
export class AlertsComponent {}
