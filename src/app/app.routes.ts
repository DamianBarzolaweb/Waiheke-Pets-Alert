import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AlertDetailComponent } from './pages/alert-detail/alert-detail.component';
import { ReportComponent } from './pages/report/report.component';
import { ResourcesComponent } from './pages/resources/resources.component';
import { HowItWorksComponent } from './pages/how-it-works/how-it-works.component';
import { MapPageComponent } from './pages/map-page/map-page.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Inicio' },
  { path: 'mapa', component: MapPageComponent, title: 'Mapa' },
  { path: 'alertas/:id', component: AlertDetailComponent, title: 'Detalle de alerta' },
  { path: 'alertas', redirectTo: '', pathMatch: 'full' },
  { path: 'how-it-works', component: HowItWorksComponent, title: 'How it works' },
  { path: 'recursos', component: ResourcesComponent, title: 'Recursos' },
  { path: 'reportar', component: ReportComponent, title: 'Reportar' },
  { path: '**', redirectTo: '' },
];
