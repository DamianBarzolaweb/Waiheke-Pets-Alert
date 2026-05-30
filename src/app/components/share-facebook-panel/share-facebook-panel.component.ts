import { NgClass } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import {
  alertPublicUrl,
  buildAlertShareText,
  copyTextToClipboard,
} from '../../lib/facebook-share';
import type { PetAlert } from '../../models/pet-alert.model';
import { SiteConfigService } from '../../services/site-config.service';

@Component({
  selector: 'app-share-facebook-panel',
  imports: [NgClass],
  templateUrl: './share-facebook-panel.component.html',
  styleUrl: './share-facebook-panel.component.scss',
})
export class ShareFacebookPanelComponent {
  private readonly siteConfig = inject(SiteConfigService);

  readonly alert = input.required<PetAlert>();
  readonly highlight = input(false);

  readonly copyOk = signal(false);
  readonly showManual = signal(false);

  readonly publicUrl = computed(() =>
    alertPublicUrl(this.alert().id, this.siteConfig.publicSiteUrl()),
  );

  readonly shareTextFull = computed(() => buildAlertShareText(this.alert(), this.publicUrl()));

  readonly groupUrl = this.siteConfig.facebookGroupUrl;

  openFacebookGroup(): void {
    window.open(this.groupUrl(), '_blank', 'noopener,noreferrer');
  }

  async copyLink(): Promise<void> {
    const ok = await copyTextToClipboard(this.publicUrl());
    this.copyOk.set(ok);
    if (ok) {
      setTimeout(() => this.copyOk.set(false), 2500);
    }
  }

  async copyFullPost(): Promise<void> {
    const ok = await copyTextToClipboard(this.shareTextFull());
    this.copyOk.set(ok);
    if (ok) {
      setTimeout(() => this.copyOk.set(false), 2500);
    }
  }

  toggleManual(): void {
    this.showManual.update((v) => !v);
  }
}
