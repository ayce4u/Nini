import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { Appointment } from '../../core/models';

const WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent !'];

@Component({
  selector: 'app-review',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon, IonTextarea],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="'/rendez-vous/' + id()" /></ion-buttons>
        <ion-title>Ton avis</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-narrow">
        <h1>Comment s'est passé ton rendez-vous&nbsp;?</h1>
        @if (a(); as a) { <p class="muted">{{ a.serviceName }} chez <strong>{{ a.provider.businessName }}</strong></p> }

        <div class="stars" role="radiogroup" aria-label="Note">
          @for (n of [1, 2, 3, 4, 5]; track n) {
            <button type="button" [attr.aria-label]="n + ' étoiles'" [class.on]="n <= rating()" (click)="rating.set(n)">
              <ion-icon [name]="n <= rating() ? 'star' : 'star-outline'" />
            </button>
          }
        </div>
        <p class="word">{{ words[rating()] }}</p>

        <label class="form-label" for="comment">Ton commentaire <span class="muted">(facultatif)</span></label>
        <ion-textarea id="comment" class="nini-input" fill="outline" [(ngModel)]="comment" [autoGrow]="true" [maxlength]="1000" [counter]="true"
          placeholder="Accueil, qualité du travail, ponctualité…" />

        <ion-button expand="block" (click)="send()" [disabled]="!rating() || busy()">Publier mon avis</ion-button>
        <p class="muted small center">Ton prénom et l'initiale de ton nom seront affichés avec ton avis.</p>
      </div>
    </ion-content>
  `,
  styles: `
    h1 { font-size: 24px; margin: 10px 0 6px; }
    .stars { display: flex; justify-content: center; gap: 6px; margin: 30px 0 6px; }
    .stars button { background: none; font-size: 44px; color: #d9cdbd; cursor: pointer; padding: 2px; transition: transform .12s; }
    .stars button.on { color: #f5a623; }
    .stars button:active { transform: scale(1.2); }
    .word { text-align: center; font-weight: 800; font-size: 18px; min-height: 26px; margin: 0 0 24px; }
    .center { text-align: center; }
  `,
})
export class ReviewPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  readonly a = signal<Appointment | null>(null);
  readonly rating = signal(0);
  readonly busy = signal(false);
  readonly words = WORDS;
  comment = '';

  async ngOnInit() {
    try {
      this.a.set(await this.api.get<Appointment>(`/appointments/${this.id()}`));
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async send() {
    this.busy.set(true);
    try {
      await this.api.post(`/appointments/${this.id()}/review`, { rating: this.rating(), comment: this.comment.trim() || undefined });
      await this.ui.toast('Merci pour ton avis !', 'success');
      await this.router.navigate(['/rendez-vous', this.id()], { replaceUrl: true });
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.busy.set(false);
    }
  }
}
