import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import { WEEKDAYS, type MyProvider, type TimeRange, type Weekday, type WeeklyHours } from '../../core/models';

@Component({
  selector: 'app-edit-hours',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonFooter, IonButton, IonIcon, IonToggle, IonSelect, IonSelectOption],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/pro/ma-page" /></ion-buttons>
        <ion-title>Horaires</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (hours(); as h) {
        <div class="page-narrow">
          <p class="muted small">Les clients ne peuvent réserver que pendant ces horaires. Ajoute une 2ᵉ plage pour une pause (ex. : prière, déjeuner).</p>
          @for (d of weekdays; track d.key) {
            <div class="day card" [class.closed]="!h[d.key].length">
              <div class="head">
                <strong>{{ d.label }}</strong>
                <ion-toggle [checked]="h[d.key].length > 0" (ionChange)="toggleDay(d.key, $event.detail.checked)" />
              </div>
              @for (r of h[d.key]; track $index; let i = $index) {
                <div class="range">
                  <input type="time" [(ngModel)]="r.start" step="900" />
                  <span>à</span>
                  <input type="time" [(ngModel)]="r.end" step="900" />
                  <button (click)="removeRange(d.key, i)" aria-label="Retirer"><ion-icon name="remove-circle-outline" /></button>
                </div>
              }
              @if (h[d.key].length) {
                <button class="link" (click)="addRange(d.key)"><ion-icon name="add" /> Ajouter une plage</button>
              } @else {
                <span class="muted small">Fermé</span>
              }
            </div>
          }
          <button class="link copy" (click)="copyMonday()"><ion-icon name="copy-outline" /> Appliquer les horaires du lundi à tous les jours ouverts</button>

          <h2>Créneaux proposés</h2>
          <label class="form-label">Un créneau commence toutes les…</label>
          <ion-select class="nini-input" fill="outline" interface="popover" [(ngModel)]="step">
            @for (s of steps; track s) { <ion-select-option [value]="s">{{ s }} minutes</ion-select-option> }
          </ion-select>
          <p class="muted small">Ex. : avec 30 minutes, les clients voient 9h00, 9h30, 10h00…</p>
          <div style="height: 90px"></div>
        </div>
      }
    </ion-content>
    <ion-footer class="ion-no-border">
      <div class="sticky-footer page-narrow"><ion-button expand="block" (click)="save()" [disabled]="!hours()">Enregistrer</ion-button></div>
    </ion-footer>
  `,
  styles: `
    .day { margin-bottom: 8px; padding: 12px 16px; }
    .day.closed { opacity: .75; }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .range { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
    .range input { flex: 1; padding: 9px 10px; border: 1px solid var(--nini-line); border-radius: 10px; font: inherit; background: #fff; color: var(--nini-ink); }
    .range button { background: none; color: var(--ion-color-danger); font-size: 22px; cursor: pointer; }
    .link { background: none; color: var(--ion-color-primary); font: inherit; font-weight: 700; font-size: 14px; display: inline-flex; align-items: center;
      gap: 4px; cursor: pointer; padding: 4px 0; }
    .copy { margin: 6px 0; }
    h2 { font-size: 19px; margin: 24px 0 10px; }
  `,
})
export class EditHoursPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  readonly weekdays = WEEKDAYS;
  readonly steps = [15, 20, 30, 45, 60, 90, 120];
  readonly hours = signal<WeeklyHours | null>(null);
  step = 30;

  async ngOnInit() {
    try {
      const p = await this.api.get<MyProvider>('/me/provider');
      const h = {} as WeeklyHours;
      for (const d of WEEKDAYS) h[d.key] = (p.weeklyHours[d.key] ?? []).map((r) => ({ ...r }));
      this.hours.set(h);
      this.step = p.slotStepMinutes;
    } catch (err) {
      await this.ui.error(err);
    }
  }

  private update(fn: (h: WeeklyHours) => void) {
    const h = structuredClone(this.hours()!);
    fn(h);
    this.hours.set(h);
  }

  toggleDay(day: Weekday, open: boolean) {
    this.update((h) => (h[day] = open ? [{ start: '08:00', end: '18:00' }] : []));
  }

  addRange(day: Weekday) {
    this.update((h) => {
      const last = h[day].at(-1);
      h[day].push({ start: last?.end ?? '14:00', end: '20:00' });
    });
  }

  removeRange(day: Weekday, i: number) {
    this.update((h) => h[day].splice(i, 1));
  }

  copyMonday() {
    this.update((h) => {
      for (const d of WEEKDAYS) if (d.key !== 'mon' && h[d.key].length) h[d.key] = h.mon.map((r: TimeRange) => ({ ...r }));
    });
  }

  async save() {
    const h = this.hours()!;
    for (const d of WEEKDAYS) {
      const ranges = [...h[d.key]].sort((a, b) => a.start.localeCompare(b.start));
      for (const [i, r] of ranges.entries()) {
        if (!r.start || !r.end || r.end <= r.start) return this.ui.toast(`${d.label} : l'heure de fin doit être après le début.`, 'danger');
        if (i && ranges[i - 1].end > r.start) return this.ui.toast(`${d.label} : deux plages se chevauchent.`, 'danger');
      }
      h[d.key] = ranges;
    }
    const ok = await this.ui.run(() => this.api.patch('/me/provider', { weeklyHours: h, slotStepMinutes: this.step }));
    if (ok) {
      await this.ui.toast('Horaires enregistrés', 'success');
      await this.router.navigateByUrl('/pro/ma-page');
    }
  }
}
