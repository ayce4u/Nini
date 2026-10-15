import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { UiService } from '../../core/ui.service';
import type { Review } from '../../core/models';
import { FrDatePipe } from '../../core/format';
import { StarsComponent } from '../../shared/stars.component';

@Component({
  selector: 'app-pro-reviews',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonTextarea, FrDatePipe, StarsComponent],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/pro/ma-page" /></ion-buttons>
        <ion-title>Avis des clients</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-narrow">
        <p class="muted small">Répondre aux avis montre que tu es sérieux, même quand l'avis est négatif.</p>
        @for (r of reviews(); track r.id) {
          <div class="card review">
            <div class="head">
              <strong>{{ r.author }}</strong>
              <span class="muted small">{{ r.createdAt | frDate: 'short' }}</span>
            </div>
            <nini-stars [value]="r.rating" [compact]="true" />
            @if (r.comment) { <p>{{ r.comment }}</p> }
            @if (editing() === r.id) {
              <ion-textarea class="nini-input" fill="outline" [autoGrow]="true" [maxlength]="1000" [(ngModel)]="draft" placeholder="Merci pour votre visite…" />
              <div class="actions">
                <ion-button size="small" (click)="save(r)">Publier</ion-button>
                <ion-button size="small" fill="clear" (click)="editing.set(null)">Annuler</ion-button>
              </div>
            } @else if (r.reply) {
              <p class="reply"><strong>Ta réponse :</strong> {{ r.reply }}</p>
              <button class="link" (click)="start(r)">Modifier</button>
            } @else {
              <button class="link" (click)="start(r)">Répondre</button>
            }
          </div>
        } @empty {
          @if (loaded()) {
            <div class="empty"><h3>Pas encore d'avis</h3><p class="muted">Après chaque rendez-vous terminé, ton client est invité à laisser un avis.</p></div>
          }
        }
      </div>
    </ion-content>
  `,
  styles: `
    .review { margin-bottom: 10px; }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .review p { margin: 8px 0; line-height: 1.5; }
    .reply { background: var(--nini-sand); padding: 10px; border-radius: 10px; font-size: 14px; }
    .link { background: none; color: var(--ion-color-primary); font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; padding: 4px 0; }
    .actions { display: flex; gap: 6px; }
  `,
})
export class ProReviewsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  readonly reviews = signal<Review[]>([]);
  readonly loaded = signal(false);
  readonly editing = signal<string | null>(null);
  draft = '';

  async ngOnInit() {
    try {
      const id = this.auth.user()?.providerId;
      const res = await this.api.get<{ items: Review[] }>(`/providers/${id}/reviews`);
      this.reviews.set(res.items);
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.loaded.set(true);
    }
  }

  start(r: Review) {
    this.draft = r.reply ?? '';
    this.editing.set(r.id);
  }

  async save(r: Review) {
    const reply = this.draft.trim();
    if (!reply) return;
    const ok = await this.ui.run(() => this.api.patch(`/me/provider/reviews/${r.id}/reply`, { reply }));
    if (ok) {
      this.reviews.update((list) => list.map((x) => (x.id === r.id ? { ...x, reply } : x)));
      this.editing.set(null);
      await this.ui.toast('Réponse publiée', 'success');
    }
  }
}
