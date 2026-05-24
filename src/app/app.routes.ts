import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AlertDetailComponent } from './pages/alert-detail/alert-detail.component';
import { ReportComponent } from './pages/report/report.component';
import { ResourcesComponent } from './pages/resources/resources.component';
import { HowItWorksComponent } from './pages/how-it-works/how-it-works.component';
import { MapPageComponent } from './pages/map-page/map-page.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TermsPageComponent } from './pages/legal/terms-page.component';
import { PrivacyPageComponent } from './pages/legal/privacy-page.component';
import { RescueProtocolComponent } from './pages/rescue-protocol/rescue-protocol.component';

export const routes: Routes = [
  /* Empty path '' must use pathMatch: 'full', otherwise every URL matches as prefix and wipes /login, /registro, etc. */
  { path: '', pathMatch: 'full', component: HomeComponent, title: 'Home' },
  { path: 'login', component: LoginComponent, title: 'Log in' },
  { path: 'registro', component: RegisterComponent, title: 'Sign up' },
  { path: 'terms', component: TermsPageComponent, title: 'Terms & Conditions' },
  { path: 'privacy', component: PrivacyPageComponent, title: 'Privacy Policy' },
  { path: 'mapa', component: MapPageComponent, title: 'Map' },
  { path: 'alertas/:id', component: AlertDetailComponent, title: 'Alert detail' },
  { path: 'alertas', redirectTo: '', pathMatch: 'full' },
  { path: 'how-it-works', component: HowItWorksComponent, title: 'How it works' },
  { path: 'recursos', component: ResourcesComponent, title: 'Resources' },
  { path: 'rescue-protocol', component: RescueProtocolComponent, title: 'Rescue protocol' },
  { path: 'reportar', component: ReportComponent, title: 'Report' },
  { path: '**', redirectTo: '' },
];
