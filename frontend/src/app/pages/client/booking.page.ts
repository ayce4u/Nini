import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
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
  IonInput,
  IonSkeletonText,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { Appointment, ProviderDetail, Service, Slot } from '../../core/models';
import { DurationPipe, FcfaPipe, FrDatePipe, addDays, frDate, isoDay } from '../../core/format';

interface DayChip {
  day: string;
  weekday: string;
  date: string;
  closed: boolean;
}

@Component({
  selector: 'app-booking',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonInput,
    IonTextarea,
    IonSpinner,
    IonSkeletonText,
    FcfaPipe,
    DurationPipe,
    FrDatePipe,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="'/prestataire/' + id()" /></ion-buttons>
        <ion-title>Réserver</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (p(); as p) {
        <div class="page-narrow">
          <p class="muted provider">chez <strong>{{ p.businessName }}</strong> · {{ p.quartier || p.city }}</p>

          <h2 class="step"><span>1</span> Choisis un service</h2>
          <div class="services">
            @for (s of activeServices(); track s.id) {
              <button type="button" class="svc card" [class.on]="s.id === serviceId()" (click)="pickService(s)">
                <div>
                  <strong>{{ s.name }}</strong>
                  <span class="muted small">{{ s.durationMinutes | duration }}</span>
                </div>
                <span class="price">{{ s.priceFrom ? 'dès ' : '' }}{{ s.priceFcfa | fcfa }}</span>
              </button>
            } @empty {
              <p class="muted">Ce prestataire n'a pas encore de service en ligne. Contacte-le directement par WhatsApp.</p>
            }
          </div>

          @if (service()) {
            <h2 class="step"><span>2</span> Choisis le jour</h2>
            <div class="days">
              @for (d of days(); track d.day) {
                <button type="button" class="day" [class.on]="d.day === day()" [class.closed]="d.closed" (click)="pickDay(d.day)">
                  <span class="wd">{{ d.weekday }}</span>
                  <span class="dn">{{ d.date }}</span>
                </button>
              }
            </div>

            <h2 class="step"><span>3</span> Choisis l'heure</h2>
            @if (loadingSlots()) {
              <div class="center"><ion-spinner name="crescent" /></div>
            } @else {
              @for (group of slotGroups(); track group.label) {
                <p class="group muted small"><ion-icon [name]="group.icon" /> {{ group.label }}</p>
                <div class="slots">
                  @for (s of group.slots; track s.startsAt) {
                    <button type="button" class="slot" [class.on]="s.startsAt === startsAt()" (click)="startsAt.set(s.startsAt)">
                      {{ s.startsAt | frDate: 'time' }}
                    </button>
                  }
                </div>
              } @empty {
                <div class="card empty-slots">
                  <ion-icon name="moon-outline" />
                  <p>Plus de place ce jour-là.<br /><span class="muted small">Essaie un autre jour.</span></p>
                </div>
              }
            }

            @if (startsAt()) {
              <h2 class="step"><span>4</span> Un mot pour le prestataire <span class="muted small">(facultatif)</span></h2>
              @if (p.mobile) {
                <label class="form-label" for="address">Adresse, si tu veux qu'il se déplace</label>
                <ion-input id="address" class="nini-input" fill="outline" [(ngModel)]="address" name="address"
                  placeholder="Ex. : Faladié, rue derrière la pharmacie" [maxlength]="200" />
              }
              <ion-textarea class="nini-input" fill="outline" [(ngModel)]="note" name="note" [autoGrow]="true" [maxlength]="500"
                placeholder="Ex. : cheveux longs, je viens avec ma fille…" />
            }
          }
          <div style="height: 110px"></div>
        </div>
      } @else {
        <div class="page-narrow"><ion-skeleton-text [animated]="true" style="height: 220px; border-radius: 18px" /></div>
      }
    </ion-content>

    @if (service() && startsAt()) {
      <ion-footer class="ion-no-border">
        <div class="sticky-footer page-narrow summary">
          <div>
            <strong>{{ service()!.name }}</strong>
            <span class="muted small">{{ startsAt()! | frDate: 'full' }} · {{ service()!.priceFcfa | fcfa }}</span>
          </div>
          <ion-button (click)="confirm()" [disabled]="busy()">Confirmer</ion-button>
        </div>
      </ion-footer>
    }
  `,
  styles: `
    .provider { margin: 0 0 4px; }
    .step { font-size: 17px; display: flex; align-items: center; gap: 10px; margin: 26px 0 12px; }
    .step > span:first-child { width: 26px; height: 26px; border-radius: 50%; background: var(--ion-color-primary); color: #fff;
      display: grid; place-items: center; font-size: 13px; }
    .services { display: grid; gap: 8px; }
    .svc { display: flex; justify-content: space-between; align-items: center; gap: 12px; border: 2px solid transparent;
      text-align: left; width: 100%; font: inherit; color: inherit; cursor: pointer; }
    .svc strong { display: block; }
    .svc.on { border-color: var(--ion-color-primary); background: #fff6ef; }
    .price { font-weight: 800; white-space: nowrap; }
    .days { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; }
    .day { flex: 0 0 62px; border-radius: 16px; padding: 10px 0; background: var(--nini-surface); box-shadow: var(--nini-shadow);
      display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; font: inherit; color: inherit; border: 2px solid transparent; }
    .day .wd { font-size: 12px; color: var(--nini-muted); text-transform: capitalize; }
    .day .dn { font-size: 19px; font-weight: 800; }
    .day.closed { opacity: .45; }
    .day.on { background: var(--ion-color-primary); color: #fff; }
    .day.on .wd { color: #fff; }
    .group { display: flex; align-items: center; gap: 6px; margin: 14px 0 8px; }
    .slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; }
    .slot { padding: 11px 0; border-radius: 12px; background: var(--nini-surface); border: 1.5px solid var(--nini-line);
      font: inherit; font-weight: 700; color: inherit; cursor: pointer; }
    .slot.on { background: var(--ion-color-primary); border-color: var(--ion-color-primary); color: #fff; }
    .center { display: grid; place-items: center; padding: 24px; }
    .empty-slots { display: flex; align-items: center; gap: 14px; }
    .empty-slots ion-icon { font-size: 30px; color: var(--nini-muted); }
    .empty-slots p { margin: 0; }
    .summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .summary strong { display: block; }
  `,
})
export class BookingPage implements OnInit {
  readonly id = input.required<string>();
  /** Service choisi sur la fiche (?service=…). */
  readonly service$ = input<string | undefined>(undefined, { alias: 'service' });

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  readonly p = signal<ProviderDetail | null>(null);
  readonly serviceId = signal<string | null>(null);
  readonly day = signal(isoDay());
  readonly slots = signal<Slot[]>([]);
  readonly loadingSlots = signal(false);
  readonly startsAt = signal<string | null>(null);
  readonly busy = signal(false);
  note = '';
  address = '';

  readonly activeServices = computed(() => this.p()?.services.filter((s) => s.active) ?? []);
  readonly service = computed(() => this.activeServices().find((s) => s.id === this.serviceId()) ?? null);

  /** Les 21 prochains jours, avec les jours de fermeture grisés. */
  readonly days = computed<DayChip[]>(() => {
    const p = this.p();
    const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    return Array.from({ length: 21 }, (_, i) => {
      const day = addDays(isoDay(), i);
      const d = new Date(`${day}T12:00:00Z`);
      return {
        day,
        weekday: i === 0 ? 'auj.' : frDate(d, 'day').split(' ')[0].replace('.', ''),
        date: String(d.getUTCDate()),
        closed: !(p?.weeklyHours[keys[d.getUTCDay()]]?.length ?? 0),
      };
    });
  });

  /** Créneaux rangés en matin / après-midi / soir, plus lisible sur téléphone. */
  readonly slotGroups = computed(() => {
    const groups = [
      { label: 'Matin', icon: 'sunny-outline', slots: [] as Slot[] },
      { label: 'Après-midi', icon: 'sunny-outline', slots: [] as Slot[] },
      { label: 'Soir', icon: 'moon-outline', slots: [] as Slot[] },
    ];
    for (const s of this.slots()) {
      const h = new Date(s.startsAt).getUTCHours();
      groups[h < 12 ? 0 : h < 17 ? 1 : 2].slots.push(s);
    }
    return groups.filter((g) => g.slots.length);
  });

  async ngOnInit() {
    try {
      const p = await this.api.get<ProviderDetail>(`/providers/${this.id()}`);
      this.p.set(p);
      const wanted = this.service$();
      const first = this.activeServices()[0];
      const chosen = this.activeServices().find((s) => s.id === wanted) ?? (this.activeServices().length === 1 ? first : undefined);
      if (chosen) await this.pickService(chosen);
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async pickService(s: Service) {
    this.serviceId.set(s.id);
    await this.loadSlots();
  }

  async pickDay(day: string) {
    this.day.set(day);
    await this.loadSlots();
  }

  private async loadSlots() {
    const s = this.service();
    if (!s) return;
    this.startsAt.set(null);
    this.loadingSlots.set(true);
    try {
      this.slots.set(
        await this.api.get<Slot[]>(`/providers/${this.id()}/availability`, { date: this.day(), duration: s.durationMinutes }),
      );
    } catch (err) {
      this.slots.set([]);
      await this.ui.error(err);
    } finally {
      this.loadingSlots.set(false);
    }
  }

  async confirm() {
    const s = this.service();
    const startsAt = this.startsAt();
    if (!s || !startsAt) return;
    this.busy.set(true);
    try {
      const appt = await this.api.post<Appointment>('/appointments', {
        providerId: this.id(),
        serviceId: s.id,
        startsAt,
        note: this.note.trim() || undefined,
        address: this.address.trim() || undefined,
      });
      await this.ui.toast('Demande envoyée ! Le prestataire va la confirmer.', 'success');
      await this.router.navigate(['/rendez-vous', appt.id], { replaceUrl: true });
    } catch (err) {
      await this.ui.error(err);
      // Le créneau a peut-être été pris entre-temps : on rafraîchit la liste.
      await this.loadSlots();
    } finally {
      this.busy.set(false);
    }
  }
}
