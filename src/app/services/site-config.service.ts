import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { apiUrl } from '../lib/api-url';

export interface SiteConfig {
  facebookGroupUrl: string;
  publicSiteUrl: string;
}

const DEFAULT_PUBLIC_SITE = 'https://www.waihekepetsalert.co.nz';
const DEFAULT_FB_GROUP = 'https://www.facebook.com/groups/waihekelostandfoundpets/';

@Injectable({ providedIn: 'root' })
export class SiteConfigService {
  private readonly http = inject(HttpClient);
  private readonly _config = signal<SiteConfig | null>(null);

  constructor() {
    this.http.get<SiteConfig>(apiUrl('/api/site-config')).subscribe({
      next: (c) => this._config.set(c),
      error: () =>
        this._config.set({
          facebookGroupUrl: DEFAULT_FB_GROUP,
          publicSiteUrl: DEFAULT_PUBLIC_SITE,
        }),
    });
  }

  readonly publicSiteUrl = computed(() => {
    const fromApi = (this._config()?.publicSiteUrl || '').trim();
    if (fromApi) {
      return fromApi.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin.replace(/\/$/, '');
    }
    return DEFAULT_PUBLIC_SITE;
  });

  readonly facebookGroupUrl = computed(() => {
    const url = (this._config()?.facebookGroupUrl || '').trim();
    return url || DEFAULT_FB_GROUP;
  });
}
