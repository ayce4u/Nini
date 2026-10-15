import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { Appointment } from '../../core/models';
import { AppointmentCardComponent } from '../../shared/appointment-card.component';

@Component({
  selector: 'app-my-appointments',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonButton,
    IonIcon,
    AppointmentCardComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-title>Mes rendez-vous</ion-title></ion-toolbar>
      <ion-toolbar>
        <ion-segment [(ngModel)]="scope" (ionChange)="load()">
          <ion-segment-button value="upcoming"><ion-label>À venir</ion-label></ion-segment-button>
          <ion-segment-button value="past"><ion-label>Passés</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content /></ion-refresher>
      <div class="page list">
        @if (items(); as items) {
          @for (a of items; track a.id) {
            <a [routerLink]="['/rendez-vous', a.id]" class="link">
              <nini-appointment-card [appointment]="a" />
              @if (a.canReview) {
                <span class="review-hint"><ion-icon name="star" /> Donne ton avis sur ce rendez-vous</span>
              }
            </a>
          } @empty {
            <div class="empty">
              <ion-icon name="calendar-outline" />
              @if (scope === 'upcoming') {
                <h3>Aucun rendez-vous prévu</h3>
                <p class="muted">Trouve un prestataire près de chez toi et réserve en quelques secondes.</p>
                <ion-button routerLink="/app/recherche">Trouver un prestataire</ion-button>
              } @else {
                <h3>Pas encore d'historique</h3>
                <p class="muted">Tes rendez-vous passés apparaîtront ici.</p>
              }
            </div>
          }
        } @else {
          @for (i of [1, 2, 3]; track i) {
            <ion-skeleton-text [animated]="true" style="height: 86px; border-radius: 18px; margin-bottom: 10px" />
          }
        }
      </div>
    </ion-content>
  `,
  styles: `
    .list { display: grid; gap: 10px; }
    .link { text-decoration: none; color: inherit; display: block; }
    .review-hint { display: flex; align-items: center; gap: 6px; margin: -4px 8px 0; padding: 10px 12px; border-radius: 0 0 14px 14px;
      background: #fff2d9; color: #8a5a00; font-weight: 700; font-size: 13px; }
  `,
})
export class MyAppointmentsPage implements ViewWillEnter {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly items = signal<Appointment[] | null>(null);
  scope: 'upcoming' | 'past' = 'upcoming';

  ionViewWillEnter() {
    void this.load();
  }

  async load() {
    try {
      this.items.set(await this.api.get<Appointment[]>('/me/appointments', { scope: this.scope }));
    } catch (err) {
      this.items.set([]);
      await this.ui.error(err);
    }
  }

  async refresh(event: CustomEvent) {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }
}
