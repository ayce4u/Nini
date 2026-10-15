import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { UiService } from '../../core/ui.service';
import type { Appointment, AppointmentStatus, Dashboard, MyProvider } from '../../core/models';
import { FcfaPipe, FrDatePipe, addDays, isoDay, whatsappLink } from '../../core/format';
import { AppointmentCardComponent } from '../../shared/appointment-card.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    FcfaPipe,
    FrDatePipe,
    AppointmentCardComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="hello">
          <span class="muted small">{{ today | frDate: 'long' }}</span>
          <strong>Bonjour {{ auth.user()?.firstName }}&nbsp;👋</strong>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content /></ion-refresher>
      <div class="page">
        @if (d(); as d) {
          <div class="kpis">
            <div class="kpi main">
              <span>Aujourd'hui</span>
              <strong>{{ d.today.revenue | fcfa }}</strong>
              <small>{{ d.today.all }} rendez-vous</small>
            </div>
            <div class="kpi">
              <span>Ce mois</span>
              <strong>{{ d.month.revenue | fcfa }}</strong>
              <small>{{ d.month.completed }} terminés</small>
            </div>
            <div class="kpi">
              <span>Cette année</span>
              <strong>{{ d.year.revenue | fcfa }}</strong>
              <small>{{ d.year.completed }} terminés</small>
            </div>
            <a class="kpi" routerLink="/pro/avis">
              <span>Ma note</span>
              <strong>{{ d.ratingCount ? d.ratingAvg.toFixed(1) : '–' }} <ion-icon name="star" class="star" /></strong>
              <small>{{ d.ratingCount }} avis</small>
            </a>
          </div>

          @if (tips().length) {
            <div class="tips">
              @for (t of tips(); track t.link) {
                <a class="tip card" [routerLink]="t.link">
                  <ion-icon [name]="t.icon" />
                  <span>{{ t.text }}</span>
                  <ion-icon name="chevron-forward" class="go" />
                </a>
              }
            </div>
          }

          <div class="section-title">
            <h2>Demandes à traiter @if (pending().length) { <span class="count">{{ pending().length }}</span> }</h2>
          </div>
          @for (a of pending(); track a.id) {
            <div class="request card">
              <nini-appointment-card [appointment]="a" side="provider" />
              @if (a.note) { <p class="note">« {{ a.note }} »</p> }
              @if (a.address) { <p class="note"><ion-icon name="location-outline" /> {{ a.address }}</p> }
              <div class="buttons">
                <ion-button color="success" size="small" (click)="setStatus(a, 'confirmed')"><ion-icon slot="start" name="checkmark" />Accepter</ion-button>
                <ion-button color="medium" fill="outline" size="small" (click)="setStatus(a, 'declined')">Refuser</ion-button>
                @if (a.client?.phone) {
                  <ion-button fill="clear" size="small" [href]="wa(a)" target="_blank"><ion-icon slot="icon-only" name="logo-whatsapp" /></ion-button>
                }
              </div>
            </div>
          } @empty {
            <p class="muted calm"><ion-icon name="checkmark-circle-outline" /> Aucune demande en attente.</p>
          }

          <div class="section-title">
            <h2>Aujourd'hui</h2>
            <a routerLink="/pro/planning">Tout le planning</a>
          </div>
          <div class="list">
            @for (a of todayList(); track a.id) {
              <nini-appointment-card [appointment]="a" side="provider" />
            } @empty {
              <div class="card empty-day">
                <ion-icon name="sunny-outline" />
                <div>
                  <strong>Journée libre pour l'instant</strong>
                  <p class="muted small">Partage tes disponibilités sur WhatsApp pour remplir ton agenda.</p>
                  <ion-button size="small" routerLink="/pro/profil/partage"><ion-icon slot="start" name="share-social-outline" />Partager</ion-button>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="kpis">
            @for (i of [1, 2, 3, 4]; track i) { <ion-skeleton-text [animated]="true" style="height: 92px; border-radius: 18px; margin: 0" /> }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .hello { display: flex; flex-direction: column; padding: 6px 4px; }
    .hello strong { font-size: 22px; letter-spacing: -0.02em; }
    .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    @media (min-width: 760px) { .kpis { grid-template-columns: repeat(4, 1fr); } }
    .kpi { background: var(--nini-surface); border-radius: 18px; padding: 14px; box-shadow: var(--nini-shadow); display: flex; flex-direction: column;
      gap: 2px; text-decoration: none; color: inherit; }
    .kpi span { color: var(--nini-muted); font-size: 13px; font-weight: 600; }
    .kpi strong { font-size: 19px; letter-spacing: -0.02em; display: flex; align-items: center; gap: 4px; }
    .kpi small { color: var(--nini-muted); font-size: 12px; }
    .kpi.main { background: var(--nini-gradient); color: #fff; }
    .kpi.main span, .kpi.main small { color: rgba(255,255,255,.88); }
    .star { color: #f5a623; font-size: 17px; }
    .tips { display: grid; gap: 8px; margin-top: 14px; }
    .tip { display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; padding: 12px 14px; background: #fff6ef; box-shadow: none;
      border: 1px solid #f6d9c3; }
    .tip ion-icon { font-size: 22px; color: var(--ion-color-primary); flex: 0 0 auto; }
    .tip span { flex: 1; font-weight: 600; font-size: 14px; }
    .tip .go { font-size: 16px; color: var(--nini-muted); }
    .count { background: var(--ion-color-primary); color: #fff; border-radius: 99px; font-size: 13px; padding: 2px 9px; margin-left: 6px; vertical-align: 3px; }
    .request { padding: 0 0 10px; margin-bottom: 10px; overflow: hidden; }
    .request nini-appointment-card ::ng-deep .card { box-shadow: none; }
    .note { margin: 0 16px 6px; font-size: 14px; color: var(--nini-muted); }
    .buttons { display: flex; gap: 8px; padding: 0 12px; align-items: center; }
    .calm { display: flex; align-items: center; gap: 6px; margin: 0 4px; }
    .list { display: grid; gap: 10px; }
    .empty-day { display: flex; gap: 14px; }
    .empty-day > ion-icon { font-size: 30px; color: #f5a623; flex: 0 0 auto; }
    .empty-day p { margin: 3px 0 10px; }
  `,
})
export class DashboardPage implements ViewWillEnter {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);

  readonly today = new Date();
  readonly d = signal<Dashboard | null>(null);
  readonly pending = signal<Appointment[]>([]);
  readonly todayList = signal<Appointment[]>([]);
  readonly me = signal<MyProvider | null>(null);

  /** Conseils pour une page qui attire plus de clients. */
  readonly tips = computed(() => {
    const p = this.me();
    if (!p) return [];
    const tips: Array<{ icon: string; text: string; link: string }> = [];
    if (!p.photos.length) tips.push({ icon: 'camera-outline', text: 'Ajoute des photos de ton travail : les clients choisissent avec les yeux.', link: '/pro/profil/photos' });
    if (!p.services.some((s) => s.active)) tips.push({ icon: 'cash-outline', text: 'Ajoute tes services et tes prix pour recevoir des réservations.', link: '/pro/profil/services' });
    if (!p.description) tips.push({ icon: 'create-outline', text: 'Présente ton activité en quelques mots.', link: '/pro/profil/infos' });
    if (!p.published) tips.push({ icon: 'eye-off-outline', text: 'Ta page est cachée : les clients ne te voient pas.', link: '/pro/profil/infos' });
    return tips;
  });

  ionViewWillEnter() {
    void this.load();
  }

  async load() {
    const day = isoDay();
    try {
      const [d, pending, todayList, me] = await Promise.all([
        this.api.get<Dashboard>('/me/provider/dashboard'),
        this.api.get<Appointment[]>('/me/provider/appointments', { status: 'pending', from: new Date().toISOString() }),
        this.api.get<Appointment[]>('/me/provider/appointments', {
          from: `${day}T00:00:00Z`,
          to: `${addDays(day, 1)}T00:00:00Z`,
          status: 'confirmed,completed,no_show',
        }),
        this.api.get<MyProvider>('/me/provider'),
      ]);
      this.d.set(d);
      this.pending.set(pending);
      this.todayList.set(todayList);
      this.me.set(me);
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async refresh(event: CustomEvent) {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  wa(a: Appointment) {
    return whatsappLink(a.client?.phone ?? '', `Bonjour ${a.client?.name ?? ''}, c'est au sujet de votre demande de rendez-vous sur Ɲini. `);
  }

  async setStatus(a: Appointment, status: AppointmentStatus) {
    if (status === 'declined' && !(await this.ui.confirm('Refuser cette demande ?', 'Le client sera prévenu.', 'Refuser', true))) return;
    const updated = await this.ui.run(() => this.api.patch<Appointment>(`/me/provider/appointments/${a.id}/status`, { status }));
    if (updated) {
      await this.ui.toast(status === 'confirmed' ? 'Rendez-vous confirmé, le client est prévenu.' : 'Demande refusée.', 'success');
      await this.load();
    }
  }
}
