import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { STATUS_COLORS, STATUS_LABELS, type Appointment } from '../core/models';
import { FcfaPipe, FrDatePipe } from '../core/format';

/** Un rendez-vous en résumé : date, service, personne en face, statut. */
@Component({
  selector: 'nini-appointment-card',
  imports: [IonIcon, FcfaPipe, FrDatePipe],
  template: `
    @let a = appointment();
    <div class="appt card">
      <div class="date">
        <span class="d">{{ day() }}</span>
        <span class="m">{{ month() }}</span>
      </div>
      <div class="body">
        <div class="top">
          <strong>{{ a.serviceName }}</strong>
          <span class="badge" [class]="'badge ' + color()">{{ label() }}</span>
        </div>
        <span class="muted small"><ion-icon name="time-outline" /> {{ a.startsAt | frDate: 'time' }} – {{ a.endsAt | frDate: 'time' }}</span>
        <span class="who small">
          @if (side() === 'client') {
            <ion-icon name="storefront-outline" /> {{ a.provider.businessName }}
            @if (a.provider.quartier) { · {{ a.provider.quartier }} }
          } @else {
            <ion-icon name="person-outline" /> {{ a.client?.name }}
            @if (a.source === 'manual') { <span class="muted"> · ajouté par vous</span> }
          }
        </span>
      </div>
      <span class="price">{{ a.priceFcfa | fcfa }}</span>
    </div>
  `,
  styles: `
    .appt { display: flex; align-items: center; gap: 14px; }
    .date { flex: 0 0 52px; height: 58px; border-radius: 14px; background: var(--nini-sand); display: flex; flex-direction: column;
      align-items: center; justify-content: center; }
    .date .d { font-size: 20px; font-weight: 800; line-height: 1; }
    .date .m { font-size: 12px; color: var(--nini-muted); text-transform: uppercase; margin-top: 3px; }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .top { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .top strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .who { display: inline-flex; align-items: center; gap: 4px; }
    .muted ion-icon, .who ion-icon { vertical-align: -2px; }
    .price { font-weight: 800; white-space: nowrap; font-size: 14px; }
  `,
})
export class AppointmentCardComponent {
  readonly appointment = input.required<Appointment>();
  /** 'client' : on montre le prestataire ; 'provider' : on montre le client. */
  readonly side = input<'client' | 'provider'>('client');

  readonly label = computed(() => STATUS_LABELS[this.appointment().status]);
  readonly color = computed(() => STATUS_COLORS[this.appointment().status]);
  readonly day = computed(() => String(new Date(this.appointment().startsAt).getUTCDate()));
  readonly month = computed(() =>
    new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Africa/Bamako' }).format(new Date(this.appointment().startsAt)).replace('.', ''),
  );
}
