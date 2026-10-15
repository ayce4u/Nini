import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonSkeletonText, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { ProviderSummary } from '../../core/models';
import { ProviderCardComponent } from '../../shared/provider-card.component';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSkeletonText, ProviderCardComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Mes favoris</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <div class="page">
        @if (items(); as items) {
          <div class="grid two">
            @for (p of items; track p.id) {
              <div class="fav">
                <nini-provider-card [provider]="p" />
                <button class="remove" (click)="remove(p)" aria-label="Retirer des favoris"><ion-icon name="heart" /></button>
              </div>
            }
          </div>
          @if (!items.length) {
            <div class="empty">
              <ion-icon name="heart-outline" />
              <h3>Pas encore de favoris</h3>
              <p class="muted">Touche le cœur sur la page d'un prestataire pour le retrouver ici.</p>
              <ion-button routerLink="/app/recherche">Découvrir des prestataires</ion-button>
            </div>
          }
        } @else {
          <div class="grid two">
            @for (i of [1, 2, 3, 4]; track i) {
              <ion-skeleton-text [animated]="true" style="height: 230px; border-radius: 18px" />
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .fav { position: relative; }
    .remove { position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; border-radius: 50%; background: #fff;
      color: #e0245e; display: grid; place-items: center; font-size: 19px; box-shadow: 0 2px 8px rgba(0,0,0,.15); cursor: pointer; }
  `,
})
export class FavoritesPage implements ViewWillEnter {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly items = signal<ProviderSummary[] | null>(null);

  async ionViewWillEnter() {
    try {
      this.items.set(await this.api.get<ProviderSummary[]>('/me/favorites'));
    } catch (err) {
      this.items.set([]);
      await this.ui.error(err);
    }
  }

  async remove(p: ProviderSummary) {
    const before = this.items() ?? [];
    this.items.set(before.filter((x) => x.id !== p.id));
    try {
      await this.api.delete(`/me/favorites/${p.id}`);
    } catch (err) {
      this.items.set(before);
      await this.ui.error(err);
    }
  }
}
