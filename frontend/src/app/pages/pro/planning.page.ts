import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActionSheetController,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { Appointment, AppointmentStatus, MyProvider, TimeOff } from '../../core/models';
import { FcfaPipe, FrDatePipe, addDays, fcfa, frDate, isoDay, whatsappLink } from '../../core/format';
import { AppointmentCardComponent } from '../../shared/appointment-card.component';

type View = 'day' | 'week' | 'month';

interface DayBlock {
  day: string;
  appointments: Appointment[];
  timeOff: TimeOff[];
}

/** Lundi de la semaine qui contient ce jour. */
function mondayOf(day: string): string {
  const wd = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((wd + 6) % 7));
}

@Component({
  selector: 'app-planning',
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
    IonFab,
    IonFabButton,
    IonFabList,
    IonModal,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    FcfaPipe,
    FrDatePipe,
    AppointmentCardComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Planning</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToday()">Aujourd'hui</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [ngModel]="view()" (ionChange)="setView($any($event.detail.value))">
          <ion-segment-button value="day"><ion-label>Jour</ion-label></ion-segment-button>
          <ion-segment-button value="week"><ion-label>Semaine</ion-label></ion-segment-button>
          <ion-segment-button value="month"><ion-label>Mois</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        <div class="nav">
          <button (click)="move(-1)" aria-label="Précédent"><ion-icon name="chevron-back" /></button>
          <div class="range">
            <strong>{{ title() }}</strong>
            <span class="muted small">{{ summary() }}</span>
          </div>
          <button (click)="move(1)" aria-label="Suivant"><ion-icon name="chevron-forward" /></button>
        </div>

        @if (view() === 'month') {
          <div class="month card">
            @for (w of weekdayInitials; track $index) { <span class="wd">{{ w }}</span> }
            @for (cell of monthCells(); track cell.day) {
              <button class="cell" [class.out]="!cell.inMonth" [class.today]="cell.day === todayIso" [class.off]="cell.off"
                (click)="openDay(cell.day)">
                <span class="n">{{ cell.n }}</span>
                @if (cell.count) { <span class="dot">{{ cell.count }}</span> }
              </button>
            }
          </div>
          <p class="muted small legend">Touche un jour pour voir le détail. Les jours grisés sont bloqués (congé, absence).</p>
        } @else {
          @for (b of blocks(); track b.day) {
            @if (view() === 'week') {
              <h3 class="day-title" [class.today]="b.day === todayIso">{{ b.day | frDate: 'long' }}</h3>
            }
            @for (t of b.timeOff; track t.id) {
              <div class="off card">
                <ion-icon name="moon-outline" />
                <div>
                  <strong>{{ t.reason || 'Indisponible' }}</strong>
                  <span class="muted small">{{ t.startsAt | frDate: 'time' }} – {{ t.endsAt | frDate: 'time' }}
                    @if (t.source === 'calendar') { · depuis ton agenda }</span>
                </div>
                @if (t.source === 'manual') {
                  <button (click)="removeTimeOff(t)" aria-label="Supprimer"><ion-icon name="trash-outline" /></button>
                }
              </div>
            }
            @for (a of b.appointments; track a.id) {
              <button class="appt" (click)="actions(a)"><nini-appointment-card [appointment]="a" side="provider" /></button>
            }
            @if (!b.appointments.length && !b.timeOff.length) {
              <p class="muted free">{{ view() === 'day' ? 'Aucun rendez-vous ce jour-là.' : 'Libre' }}</p>
            }
          }
        }
        <div style="height: 90px"></div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button><ion-icon name="add" /></ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button (click)="openManual()" title="Ajouter un rendez-vous"><ion-icon name="calendar" /></ion-fab-button>
          <ion-fab-button (click)="openTimeOff()" title="Bloquer un moment"><ion-icon name="moon-outline" /></ion-fab-button>
        </ion-fab-list>
      </ion-fab>

      <!-- Rendez-vous ajouté à la main (client venu par téléphone ou sur place) -->
      <ion-modal [isOpen]="manualOpen()" (didDismiss)="manualOpen.set(false)">
        <ng-template>
          <ion-header><ion-toolbar>
            <ion-title>Nouveau rendez-vous</ion-title>
            <ion-buttons slot="end"><ion-button (click)="manualOpen.set(false)">Fermer</ion-button></ion-buttons>
          </ion-toolbar></ion-header>
          <ion-content>
            <form class="page-narrow" (ngSubmit)="saveManual()">
              <p class="muted small">Pour un client qui t'a appelé ou qui est venu sans réserver : ton planning et tes revenus restent complets.</p>
              <label class="form-label">Nom du client</label>
              <ion-input class="nini-input" fill="outline" name="clientName" [(ngModel)]="manual.clientName" />
              <label class="form-label">Téléphone <span class="muted">(facultatif)</span></label>
              <ion-input class="nini-input" fill="outline" type="tel" name="clientPhone" [(ngModel)]="manual.clientPhone" />
              <label class="form-label">Service</label>
              <ion-select class="nini-input" fill="outline" name="serviceId" [(ngModel)]="manual.serviceId" interface="action-sheet" cancelText="Annuler">
                @for (s of services(); track s.id) {
                  <ion-select-option [value]="s.id">{{ s.name }} · {{ s.priceFcfa | fcfa }}</ion-select-option>
                }
                <ion-select-option value="">Autre…</ion-select-option>
              </ion-select>
              @if (!manual.serviceId) {
                <div class="grid two">
                  <ion-input class="nini-input" fill="outline" label="Prestation" labelPlacement="stacked" name="serviceName" [(ngModel)]="manual.serviceName" />
                  <ion-input class="nini-input" fill="outline" label="Prix (FCFA)" labelPlacement="stacked" type="number" name="price" [(ngModel)]="manual.priceFcfa" />
                </div>
              }
              <div class="grid two">
                <ion-input class="nini-input" fill="outline" label="Jour" labelPlacement="stacked" type="date" name="day" [(ngModel)]="manual.day" />
                <ion-input class="nini-input" fill="outline" label="Heure" labelPlacement="stacked" type="time" name="time" [(ngModel)]="manual.time" />
              </div>
              <div class="toggle card">
                <span><strong>Déjà terminé</strong><br /><span class="muted small">Compte tout de suite dans tes revenus</span></span>
                <ion-toggle name="done" [(ngModel)]="manual.done" />
              </div>
              <ion-button expand="block" type="submit">Ajouter au planning</ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Bloquer un moment (congé, rendez-vous perso…) -->
      <ion-modal [isOpen]="offOpen()" (didDismiss)="offOpen.set(false)">
        <ng-template>
          <ion-header><ion-toolbar>
            <ion-title>Bloquer un moment</ion-title>
            <ion-buttons slot="end"><ion-button (click)="offOpen.set(false)">Fermer</ion-button></ion-buttons>
          </ion-toolbar></ion-header>
          <ion-content>
            <form class="page-narrow" (ngSubmit)="saveTimeOff()">
              <p class="muted small">Les clients ne pourront pas réserver pendant ce moment.</p>
              <label class="form-label">Raison <span class="muted">(visible par toi seulement)</span></label>
              <ion-input class="nini-input" fill="outline" name="reason" placeholder="Ex. : Tabaski, mariage, congé" [(ngModel)]="off.reason" />
              <div class="toggle card">
                <strong>Journées entières</strong>
                <ion-toggle name="allDay" [(ngModel)]="off.allDay" />
              </div>
              <div class="grid two">
                <ion-input class="nini-input" fill="outline" label="Du" labelPlacement="stacked" type="date" name="from" [(ngModel)]="off.fromDay" />
                @if (off.allDay) {
                  <ion-input class="nini-input" fill="outline" label="Au (inclus)" labelPlacement="stacked" type="date" name="to" [(ngModel)]="off.toDay" />
                } @else {
                  <ion-input class="nini-input" fill="outline" label="De" labelPlacement="stacked" type="time" name="fromTime" [(ngModel)]="off.fromTime" />
                }
              </div>
              @if (!off.allDay) {
                <ion-input class="nini-input" fill="outline" label="À" labelPlacement="stacked" type="time" name="toTime" [(ngModel)]="off.toTime" />
              }
              <ion-button expand="block" type="submit">Bloquer</ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: `
    .nav { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .nav button { width: 42px; height: 42px; border-radius: 50%; background: var(--nini-surface); box-shadow: var(--nini-shadow); display: grid;
      place-items: center; font-size: 18px; color: var(--nini-ink); cursor: pointer; }
    .range { flex: 1; text-align: center; display: flex; flex-direction: column; }
    .range strong { font-size: 17px; }
    .day-title { font-size: 15px; margin: 20px 4px 8px; }
    .day-title.today { color: var(--ion-color-primary); }
    .appt { display: block; width: 100%; padding: 0; background: none; text-align: left; font: inherit; color: inherit; margin-bottom: 8px; cursor: pointer; }
    .off { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; background: #eef1f6; box-shadow: none; }
    .off > ion-icon { font-size: 22px; color: var(--ion-color-tertiary); }
    .off div { flex: 1; display: flex; flex-direction: column; }
    .off button { background: none; color: var(--ion-color-danger); font-size: 18px; cursor: pointer; }
    .free { margin: 4px 6px 8px; font-size: 14px; }
    .month { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 10px; }
    .wd { text-align: center; font-size: 12px; font-weight: 700; color: var(--nini-muted); padding: 4px 0; }
    .cell { aspect-ratio: 1; border-radius: 12px; background: none; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px; font: inherit; color: inherit; cursor: pointer; }
    .cell:hover { background: var(--nini-sand); }
    .cell .n { font-weight: 700; }
    .cell.out { opacity: .35; }
    .cell.off { background: #eef1f6; }
    .cell.today .n { background: var(--ion-color-primary); color: #fff; border-radius: 50%; width: 28px; height: 28px; display: grid; place-items: center; }
    .dot { font-size: 11px; font-weight: 800; background: #fff1e6; color: var(--ion-color-primary); border-radius: 99px; padding: 0 7px; }
    .legend { margin: 10px 4px; }
    .toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 16px; box-shadow: none; border: 1px solid var(--nini-line); }
  `,
})
export class PlanningPage implements ViewWillEnter {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly sheets = inject(ActionSheetController);

  readonly todayIso = isoDay();
  readonly weekdayInitials = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly view = signal<View>('day');
  readonly anchor = signal(isoDay());
  readonly appointments = signal<Appointment[]>([]);
  readonly timeOff = signal<TimeOff[]>([]);
  readonly provider = signal<MyProvider | null>(null);
  readonly services = computed(() => this.provider()?.services.filter((s) => s.active) ?? []);
  readonly manualOpen = signal(false);
  readonly offOpen = signal(false);

  manual = { clientName: '', clientPhone: '', serviceId: '', serviceName: '', priceFcfa: null as number | null, day: isoDay(), time: '09:00', done: false };
  off = { reason: '', allDay: true, fromDay: isoDay(), toDay: isoDay(), fromTime: '12:00', toTime: '15:00' };

  /** Début et fin (exclue) de la période affichée. */
  readonly range = computed(() => {
    const a = this.anchor();
    if (this.view() === 'day') return { from: a, to: addDays(a, 1) };
    if (this.view() === 'week') {
      const m = mondayOf(a);
      return { from: m, to: addDays(m, 7) };
    }
    const first = `${a.slice(0, 7)}-01`;
    const next = new Date(`${first}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { from: first, to: isoDay(next) };
  });

  readonly title = computed(() => {
    const { from, to } = this.range();
    if (this.view() === 'day') return frDate(new Date(`${from}T12:00:00Z`), 'long');
    if (this.view() === 'week') return `${frDate(new Date(`${from}T12:00:00Z`), 'short')} – ${frDate(new Date(`${addDays(to, -1)}T12:00:00Z`), 'short')}`;
    const t = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${from}T12:00:00Z`));
    return t.charAt(0).toUpperCase() + t.slice(1);
  });

  readonly summary = computed(() => {
    const list = this.appointments().filter((a) => ['confirmed', 'completed', 'pending'].includes(a.status));
    const revenue = list.filter((a) => a.status === 'completed').reduce((s, a) => s + a.priceFcfa, 0);
    return `${list.length} rendez-vous${revenue ? ' · ' + fcfa(revenue) + ' encaissés' : ''}`;
  });

  readonly blocks = computed<DayBlock[]>(() => {
    const { from, to } = this.range();
    const days: string[] = [];
    for (let d = from; d < to; d = addDays(d, 1)) days.push(d);
    return days.map((day) => ({
      day,
      appointments: this.appointments().filter((a) => isoDay(new Date(a.startsAt)) === day),
      timeOff: this.timeOff().filter((t) => isoDay(new Date(t.startsAt)) <= day && isoDay(new Date(new Date(t.endsAt).getTime() - 1)) >= day),
    }));
  });

  readonly monthCells = computed(() => {
    const { from, to } = this.range();
    const start = mondayOf(from);
    const cells = [];
    for (let d = start; d < to || cells.length % 7 !== 0; d = addDays(d, 1)) {
      const dayStart = new Date(`${d}T00:00:00Z`).getTime();
      const dayEnd = dayStart + 86_400_000;
      cells.push({
        day: d,
        n: Number(d.slice(8)),
        inMonth: d >= from && d < to,
        count: this.appointments().filter((a) => isoDay(new Date(a.startsAt)) === d && a.status !== 'cancelled' && a.status !== 'declined').length,
        off: this.timeOff().some((t) => new Date(t.startsAt).getTime() <= dayStart + 3_600_000 && new Date(t.endsAt).getTime() >= dayEnd - 3_600_000),
      });
    }
    return cells;
  });

  ionViewWillEnter() {
    void this.load();
    void this.api.get<MyProvider>('/me/provider').then((p) => this.provider.set(p)).catch(() => undefined);
  }

  async load() {
    const { from, to } = this.range();
    const params = { from: `${from}T00:00:00Z`, to: `${to}T00:00:00Z` };
    try {
      const [appointments, timeOff] = await Promise.all([
        this.api.get<Appointment[]>('/me/provider/appointments', params),
        this.api.get<TimeOff[]>('/me/provider/time-off', params),
      ]);
      this.appointments.set(appointments);
      this.timeOff.set(timeOff);
    } catch (err) {
      await this.ui.error(err);
    }
  }

  setView(v: View) {
    this.view.set(v);
    void this.load();
  }

  move(step: number) {
    const a = this.anchor();
    if (this.view() === 'day') this.anchor.set(addDays(a, step));
    else if (this.view() === 'week') this.anchor.set(addDays(a, step * 7));
    else {
      const d = new Date(`${a.slice(0, 7)}-01T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + step);
      this.anchor.set(isoDay(d));
    }
    void this.load();
  }

  goToday() {
    this.anchor.set(isoDay());
    void this.load();
  }

  openDay(day: string) {
    this.anchor.set(day);
    this.setView('day');
  }

  /** Les actions possibles dépendent du statut du rendez-vous. */
  async actions(a: Appointment) {
    const started = new Date(a.startsAt).getTime() <= Date.now();
    const buttons: Array<{ text: string; role?: string; icon?: string; handler?: () => void }> = [];
    const go = (status: AppointmentStatus) => () => void this.setStatus(a, status);
    if (a.status === 'pending') {
      buttons.push({ text: 'Accepter', icon: 'checkmark-circle-outline', handler: go('confirmed') });
      buttons.push({ text: 'Refuser', icon: 'close-circle-outline', role: 'destructive', handler: go('declined') });
    }
    if (a.status === 'confirmed') {
      if (started) {
        buttons.push({ text: 'Terminé (payé)', icon: 'checkmark-circle-outline', handler: go('completed') });
        buttons.push({ text: 'Le client n’est pas venu', icon: 'alert-circle-outline', handler: go('no_show') });
      }
      buttons.push({ text: 'Annuler le rendez-vous', icon: 'close-circle-outline', role: 'destructive', handler: go('cancelled') });
    }
    if (a.client?.phone) {
      buttons.push({
        text: 'Écrire sur WhatsApp',
        icon: 'logo-whatsapp',
        handler: () => window.open(whatsappLink(a.client!.phone!, `Bonjour ${a.client!.name}, `), '_blank'),
      });
      buttons.push({ text: 'Appeler', icon: 'call-outline', handler: () => window.open(`tel:${a.client!.phone}`, '_self') });
    }
    buttons.push({ text: 'Fermer', role: 'cancel' });
    const sheet = await this.sheets.create({
      header: `${a.serviceName} · ${a.client?.name ?? ''}`,
      subHeader: `${frDate(a.startsAt, 'full')} · ${fcfa(a.priceFcfa)}${a.note ? ' · « ' + a.note + ' »' : ''}`,
      buttons,
    });
    await sheet.present();
  }

  async setStatus(a: Appointment, status: AppointmentStatus) {
    const updated = await this.ui.run(() => this.api.patch<Appointment>(`/me/provider/appointments/${a.id}/status`, { status }));
    if (updated) {
      this.appointments.update((list) => list.map((x) => (x.id === a.id ? updated : x)));
      await this.ui.toast('C’est noté.', 'success');
    }
  }

  openManual() {
    this.manual = { ...this.manual, clientName: '', clientPhone: '', day: this.anchor(), serviceId: this.services()[0]?.id ?? '' };
    this.manualOpen.set(true);
  }

  async saveManual() {
    const m = this.manual;
    if (!m.clientName.trim()) return this.ui.toast('Indique le nom du client.', 'danger');
    if (!m.serviceId && !m.serviceName.trim()) return this.ui.toast('Indique la prestation.', 'danger');
    const created = await this.ui.run(() =>
      this.api.post<Appointment>('/me/provider/appointments', {
        clientName: m.clientName.trim(),
        clientPhone: m.clientPhone.trim() || undefined,
        serviceId: m.serviceId || undefined,
        serviceName: m.serviceId ? undefined : m.serviceName.trim(),
        priceFcfa: m.serviceId ? undefined : Number(m.priceFcfa ?? 0),
        startsAt: new Date(`${m.day}T${m.time}:00Z`).toISOString(),
        status: m.done ? 'completed' : 'confirmed',
      }),
    );
    if (created) {
      this.manualOpen.set(false);
      await this.ui.toast('Rendez-vous ajouté', 'success');
      await this.load();
    }
  }

  openTimeOff() {
    this.off = { ...this.off, reason: '', fromDay: this.anchor(), toDay: this.anchor() };
    this.offOpen.set(true);
  }

  async saveTimeOff() {
    const o = this.off;
    const startsAt = o.allDay ? `${o.fromDay}T00:00:00Z` : `${o.fromDay}T${o.fromTime}:00Z`;
    const endsAt = o.allDay ? `${addDays(o.toDay, 1)}T00:00:00Z` : `${o.fromDay}T${o.toTime}:00Z`;
    if (endsAt <= startsAt) return this.ui.toast('La fin doit être après le début.', 'danger');
    const created = await this.ui.run(() =>
      this.api.post<TimeOff>('/me/provider/time-off', { startsAt, endsAt, reason: o.reason.trim() || undefined }),
    );
    if (created) {
      this.offOpen.set(false);
      await this.ui.toast('Moment bloqué', 'success');
      await this.load();
    }
  }

  async removeTimeOff(t: TimeOff) {
    if (!(await this.ui.confirm('Débloquer ce moment ?', 'Les clients pourront de nouveau réserver.', 'Débloquer'))) return;
    await this.ui.run(() => this.api.delete(`/me/provider/time-off/${t.id}`));
    await this.load();
  }
}
