import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { Period, Stats } from '../../core/models';
import { FcfaPipe, addDays, frDate, isoDay } from '../../core/format';
import { BarChartComponent } from '../../shared/bar-chart.component';

@Component({
  selector: 'app-stats',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSkeletonText,
    FcfaPipe,
    BarChartComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Mes revenus</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="exportCsv()" title="Télécharger pour Excel"><ion-icon slot="icon-only" name="download-outline" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [ngModel]="period()" (ionChange)="setPeriod($any($event.detail.value))">
          <ion-segment-button value="day"><ion-label>Jour</ion-label></ion-segment-button>
          <ion-segment-button value="week"><ion-label>Semaine</ion-label></ion-segment-button>
          <ion-segment-button value="month"><ion-label>Mois</ion-label></ion-segment-button>
          <ion-segment-button value="year"><ion-label>Année</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        <div class="nav">
          <button (click)="move(-1)" aria-label="Précédent"><ion-icon name="chevron-back" /></button>
          <strong>{{ title() }}</strong>
          <button (click)="move(1)" [disabled]="isCurrent()" aria-label="Suivant"><ion-icon name="chevron-forward" /></button>
        </div>

        @if (s(); as s) {
          <div class="hero card">
            <span>Chiffre d'affaires</span>
            <strong>{{ s.revenue | fcfa }}</strong>
            @if (s.revenueChange != null) {
              <span class="change" [class.down]="s.revenueChange < 0">
                <ion-icon [name]="s.revenueChange < 0 ? 'trending-down' : 'trending-up'" />
                {{ s.revenueChange > 0 ? '+' : '' }}{{ s.revenueChange }}&nbsp;% {{ compareLabel() }}
              </span>
            } @else if (s.previousRevenue === 0 && s.revenue > 0) {
              <span class="change"><ion-icon name="trending-up" /> Nouveau&nbsp;!</span>
            }
          </div>

          <div class="kpis">
            <div class="kpi"><ion-icon name="calendar-outline" /><strong>{{ s.appointments }}</strong><span>rendez-vous</span></div>
            <div class="kpi"><ion-icon name="checkmark-circle-outline" /><strong>{{ s.completed }}</strong><span>terminés</span></div>
            <div class="kpi"><ion-icon name="wallet-outline" /><strong>{{ s.averageBasket | fcfa }}</strong><span>panier moyen</span></div>
            <div class="kpi"><ion-icon name="people-outline" /><strong>{{ s.newClients }}</strong><span>nouveaux clients</span></div>
            <div class="kpi"><ion-icon name="close-circle-outline" /><strong>{{ s.cancellationRate }}&nbsp;%</strong><span>annulés ou absents</span></div>
            <div class="kpi"><ion-icon name="hourglass-outline" /><strong>{{ s.pending }}</strong><span>en attente</span></div>
          </div>

          @if (s.series.length > 1) {
            <div class="section-title"><h2>{{ chartTitle() }}</h2></div>
            <div class="card">
              <nini-bar-chart [labels]="labels()" [revenue]="revenue()" [counts]="counts()" height="260px" />
              <p class="legend muted small"><span class="sq bar"></span> Chiffre d'affaires <span class="sq line"></span> Rendez-vous</p>
            </div>
          }

          <div class="grid two">
            <div>
              <div class="section-title"><h2>Services les plus demandés</h2></div>
              <div class="card rank">
                @for (t of s.topServices; track t.name; let i = $index) {
                  <div class="row">
                    <span class="pos">{{ i + 1 }}</span>
                    <div class="what"><strong>{{ t.name }}</strong><span class="muted small">{{ t.count }} fois</span>
                      <div class="bar"><span [style.width.%]="share(t.revenue, s.topServices[0].revenue)"></span></div>
                    </div>
                    <span class="amount">{{ t.revenue | fcfa }}</span>
                  </div>
                } @empty { <p class="muted">Pas encore de rendez-vous terminé sur cette période.</p> }
              </div>
            </div>
            <div>
              <div class="section-title"><h2>Meilleurs clients</h2></div>
              <div class="card rank">
                @for (t of s.topClients; track t.name; let i = $index) {
                  <div class="row">
                    <span class="pos">{{ i + 1 }}</span>
                    <div class="what"><strong>{{ t.name }}</strong><span class="muted small">{{ t.count }} visite{{ t.count > 1 ? 's' : '' }}</span></div>
                    <span class="amount">{{ t.revenue | fcfa }}</span>
                  </div>
                } @empty { <p class="muted">Tes clients fidèles apparaîtront ici.</p> }
              </div>
            </div>
          </div>
          <p class="muted small note">Seuls les rendez-vous marqués « Terminé » comptent dans le chiffre d'affaires.</p>
        } @else {
          <ion-skeleton-text [animated]="true" style="height: 120px; border-radius: 18px" />
          <ion-skeleton-text [animated]="true" style="height: 260px; border-radius: 18px; margin-top: 14px" />
        }
      </div>
    </ion-content>
  `,
  styles: `
    .nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .nav strong { font-size: 17px; }
    .nav button { width: 42px; height: 42px; border-radius: 50%; background: var(--nini-surface); box-shadow: var(--nini-shadow); display: grid;
      place-items: center; font-size: 18px; color: var(--nini-ink); cursor: pointer; }
    .nav button:disabled { opacity: .3; }
    .hero { background: var(--nini-gradient); color: #fff; display: flex; flex-direction: column; gap: 4px; padding: 20px; }
    .hero > span:first-child { opacity: .88; font-weight: 600; }
    .hero strong { font-size: 32px; letter-spacing: -0.03em; }
    .change { align-self: flex-start; display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,.2); padding: 4px 10px;
      border-radius: 99px; font-weight: 700; font-size: 13px; }
    .change.down { background: rgba(0,0,0,.18); }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
    @media (min-width: 760px) { .kpis { grid-template-columns: repeat(6, 1fr); } }
    .kpi { background: var(--nini-surface); border-radius: 16px; padding: 12px 10px; box-shadow: var(--nini-shadow); display: flex; flex-direction: column; gap: 2px; }
    .kpi ion-icon { color: var(--ion-color-primary); font-size: 18px; }
    .kpi strong { font-size: 16px; }
    .kpi span { font-size: 11.5px; color: var(--nini-muted); line-height: 1.2; }
    .legend { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; }
    .sq { width: 12px; height: 12px; border-radius: 3px; display: inline-block; margin-left: 8px; }
    .sq.bar { background: var(--ion-color-primary); margin-left: 0; }
    .sq.line { background: var(--ion-color-tertiary); }
    .rank { padding: 6px 16px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--nini-line); }
    .row:last-child { border-bottom: 0; }
    .pos { width: 26px; height: 26px; border-radius: 50%; background: var(--nini-sand); display: grid; place-items: center; font-weight: 800; font-size: 13px; flex: 0 0 auto; }
    .what { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .bar { height: 5px; background: var(--nini-sand); border-radius: 99px; margin-top: 5px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--ion-color-primary); border-radius: 99px; }
    .amount { font-weight: 800; white-space: nowrap; font-size: 14px; }
    .note { text-align: center; margin: 20px 0; }
  `,
})
export class StatsPage implements ViewWillEnter {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);

  readonly period = signal<Period>('month');
  readonly date = signal(isoDay());
  readonly s = signal<Stats | null>(null);

  readonly labels = computed(() => this.s()?.series.map((x) => x.label) ?? []);
  readonly revenue = computed(() => this.s()?.series.map((x) => x.revenue) ?? []);
  readonly counts = computed(() => this.s()?.series.map((x) => x.count) ?? []);
  readonly isCurrent = computed(() => {
    const s = this.s();
    return !!s && new Date(s.to).getTime() > Date.now();
  });

  readonly title = computed(() => {
    const d = new Date(`${this.date()}T12:00:00Z`);
    const fmt = (o: Intl.DateTimeFormatOptions) => {
      const t = new Intl.DateTimeFormat('fr-FR', { ...o, timeZone: 'UTC' }).format(d);
      return t.charAt(0).toUpperCase() + t.slice(1);
    };
    switch (this.period()) {
      case 'day':
        return frDate(d, 'long');
      case 'week': {
        const s = this.s();
        return s ? `${frDate(s.from, 'short')} – ${frDate(new Date(new Date(s.to).getTime() - 1), 'short')}` : 'Semaine';
      }
      case 'month':
        return fmt({ month: 'long', year: 'numeric' });
      default:
        return fmt({ year: 'numeric' });
    }
  });

  readonly compareLabel = computed(
    () => ({ day: 'vs la veille', week: 'vs semaine dernière', month: 'vs mois dernier', year: 'vs année dernière' })[this.period()],
  );
  readonly chartTitle = computed(
    () => ({ day: 'Heure par heure', week: 'Jour par jour', month: 'Jour par jour', year: 'Mois par mois' })[this.period()],
  );

  ionViewWillEnter() {
    void this.load();
  }

  async load() {
    try {
      this.s.set(await this.api.get<Stats>('/me/provider/stats', { period: this.period(), date: this.date() }));
    } catch (err) {
      await this.ui.error(err);
    }
  }

  setPeriod(p: Period) {
    this.period.set(p);
    this.date.set(isoDay());
    void this.load();
  }

  move(step: number) {
    const d = this.date();
    const p = this.period();
    if (p === 'day') this.date.set(addDays(d, step));
    else if (p === 'week') this.date.set(addDays(d, step * 7));
    else {
      const x = new Date(`${d.slice(0, 7)}-01T00:00:00Z`);
      if (p === 'month') x.setUTCMonth(x.getUTCMonth() + step);
      else x.setUTCFullYear(x.getUTCFullYear() + step);
      this.date.set(isoDay(x));
    }
    void this.load();
  }

  share(value: number, max: number) {
    return max ? Math.max(4, Math.round((value / max) * 100)) : 0;
  }

  /** Fichier CSV qui s'ouvre dans Excel ou Google Sheets. */
  async exportCsv() {
    const s = this.s();
    if (!s) return;
    const blob = await this.ui.run(() => this.api.blob('/me/provider/stats/export.csv', { from: s.from, to: s.to }), 'Préparation du fichier…');
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nini-revenus-${s.from.slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
