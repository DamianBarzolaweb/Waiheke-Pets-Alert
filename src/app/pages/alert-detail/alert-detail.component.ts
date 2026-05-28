import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeafletMapComponent, type LeafletMapMarker } from '../../components/leaflet-map/leaflet-map.component';
import { alertHeadline, type CommunitySighting, type PetAlert } from '../../models/pet-alert.model';
import { AuthService } from '../../services/auth.service';
import { PetAlertsService } from '../../services/pet-alerts.service';

@Component({
  selector: 'app-alert-detail',
  imports: [RouterLink, LeafletMapComponent, ReactiveFormsModule],
  templateUrl: './alert-detail.component.html',
  styleUrl: './alert-detail.component.scss',
})
export class AlertDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly alertsService = inject(PetAlertsService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly alertId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });

  readonly detailLoading = signal(true);
  readonly detailError = signal<string | null>(null);
  readonly alert = signal<PetAlert | undefined>(undefined);

  readonly replyToId = signal<string | null>(null);
  readonly posting = signal(false);
  readonly postError = signal<string | null>(null);

  readonly commentForm = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly currentUser = this.auth.user;

  readonly heroTitle = computed(() => {
    const a = this.alert();
    if (!a) {
      return '';
    }
    if (a.status === 'Lost') {
      return `Finding ${a.name}`;
    }
    const head = alertHeadline(a);
    return head === 'Sighted pet' || !(a.name ?? '').trim() ? head : `Sighted: ${a.name}`;
  });

  readonly mapMarkers = computed((): LeafletMapMarker[] => {
    const a = this.alert();
    if (!a) {
      return [];
    }
    return [{ lat: a.lat, lng: a.lng, title: alertHeadline(a), subtitle: a.location, status: a.status }];
  });

  readonly topLevelPosts = computed(() => {
    const list = this.alert()?.sightings ?? [];
    return list.filter((s) => !s.parentId);
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      if (!id) {
        this.detailLoading.set(false);
        this.alert.set(undefined);
        return;
      }
      this.loadAlert(id);
    });
  }

  repliesFor(parentId: string): CommunitySighting[] {
    return (this.alert()?.sightings ?? []).filter((s) => s.parentId === parentId);
  }

  startReply(postId: string): void {
    this.replyToId.set(postId);
    this.postError.set(null);
    document.getElementById('community-comment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  cancelReply(): void {
    this.replyToId.set(null);
  }

  private loadAlert(id: string): void {
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.replyToId.set(null);
    this.alertsService.fetchById(id).subscribe({
      next: (row) => {
        this.alert.set(row);
        this.alertsService.upsertInCache(row);
        this.detailLoading.set(false);
      },
      error: () => {
        this.alert.set(this.alertsService.getById(id));
        this.detailLoading.set(false);
        if (!this.alert()) {
          this.detailError.set('Could not load this alert.');
        }
      },
    });
  }

  submitComment(event: Event): void {
    event.preventDefault();
    const id = this.alertId();
    if (!id || this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }
    if (!this.isLoggedIn()) {
      this.postError.set('Log in to post a comment.');
      return;
    }
    this.postError.set(null);
    this.posting.set(true);
    const body = this.commentForm.getRawValue().body.trim();
    const parentId = this.replyToId() ?? undefined;
    this.alertsService.postComment(id, body, parentId).subscribe({
      next: () => {
        this.commentForm.reset();
        this.replyToId.set(null);
        this.posting.set(false);
        this.loadAlert(id);
      },
      error: (err) => {
        this.posting.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.postError.set('Log in to post a comment.');
          return;
        }
        const msg =
          err instanceof HttpErrorResponse && err.error && typeof err.error === 'object'
            ? String((err.error as { error?: string }).error || '')
            : '';
        this.postError.set(msg || 'Could not post your comment. Try again.');
      },
    });
  }
}
