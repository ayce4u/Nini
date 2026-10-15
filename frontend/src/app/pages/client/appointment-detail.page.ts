import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import { STATUS_COLORS, STATUS_LABELS, type Appointment } from '../../core/models';
import { FcfaPipe, FrDatePipe, whatsappLink } from '../../core/format';

@Component({
  selector: 'app-appointment-detail',
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon, IonSkeletonText, FcfaPipe, FrDatePipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/app/rendez-vous" /></ion-buttons>
        <ion-title>Rendez-vous</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (a(); as a) {
        <div class="page-narrow">
          <div class="hero card" [class]="'hero card ' + a.status">
            <span class="badge" [class]="'badge ' + statusColor()">{{ statusLabel() }}</span>
            <h1>{{ a.startsAt | frDate: 'long' }}</h1>
            <p class="time"><ion-icon name="time-outline" /> {{ a.startsAt | frDate: 'time' }} – {{ a.endsAt | frDate: 'time' }}</p>
            <p class="hint">{{ hint() }}</p>
          </div>

          <div class="card rows">
            <div class="row"><span class="muted">Service</span><strong>{{ a.serviceName }}</strong></div>
            <div class="row"><span class="muted">Prix</span><strong>{{ a.priceFcfa | fcfa }}</strong></div>
            <div class="row">
              <span class="muted">Prestataire</span>
              <a [routerLink]="['/prestataire', a.provider.id]"><strong>{{ a.provider.businessName }}</strong></a>
            </div>
            @if (a.provider.quartier) { <div class="row"><span class="muted">Quartier</span><span>{{ a.provider.quartier }}</span></div> }
            @if (a.address) { <div class="row"><span class="muted">Adresse</span><span>{{ a.address }}</span></div> }
            @if (a.note) { <div class="row col"><span class="muted">Ton message</span><span>{{ a.note }}</span></div> }
          </div>

          <div class="actions">
            @if (a.provider.whatsapp || a.provider.phone) {
              <a class="act wa" [href]="wa()" target="_blank" rel="noopener"><ion-icon name="logo-whatsapp" /> WhatsApp</a>
              <a class="act" [href]="'tel:' + a.provider.phone"><ion-icon name="call" /> Appeler</a>
            }
            @if (a.provider.lat != null) {
              <a class="act" [href]="directions()" target="_blank" rel="noopener"><ion-icon name="navigate-outline" /> Itinéraire</a>
            }
          </div>

          @if (a.canReview) {
            <ion-button expand="block" [routerLink]="['/rendez-vous', a.id, 'avis']"><ion-icon slot="start" name="star" />Donner mon avis</ion-button>
          }
          @if (a.reviewed) {
            <p class="muted center"><ion-icon name="checkmark-circle" /> Merci, ton avis a été publié.</p>
          }
          @if (cancellable()) {
            <ion-button expand="block" fill="clear" color="danger" (click)="cancel()">Annuler le rendez-vous</ion-button>
          }
          @if (a.status === 'completed' || a.status === 'cancelled' || a.status === 'declined') {
            <ion-button expand="block" fill="outline" [routerLink]="['/prestataire', a.provider.id, 'reserver']">Réserver à nouveau</ion-button>
          }
        </div>
      } @else {
        <div class="page-narrow"><ion-skeleton-text [animated]="true" style="height: 200px; border-radius: 18px" /></div>
      }
    </ion-content>
  `,
  styles: `
    .hero { text-align: center; padding: 26px 18px; margin-bottom: 14px; background: var(--nini-gradient); color: #fff; }
    .hero.cancelled, .hero.declined, .hero.no_show { background: #6b7280; }
    .hero .badge { background: rgba(255,255,255,.22); color: #fff; }
    .hero h1 { margin: 12px 0 4px; font-size: 24px; }
    .time { margin: 0; font-size: 18px; font-weight: 700; display: inline-flex; gap: 6px; align-items: center; }
    .hint { margin: 12px 0 0; opacity: .92; font-size: 14px; }
    .rows { padding: 4px 16px; margin-bottom: 14px; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid var(--nini-line); }
    .row:last-child { border-bottom: 0; }
    .row.col { flex-direction: column; gap: 4px; }
    .row a { color: var(--ion-color-primary); text-decoration: none; }
    .actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin-bottom: 16px; }
    .act { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 13px; border-radius: 14px; background: var(--nini-surface);
      box-shadow: var(--nini-shadow); text-decoration: none; color: var(--nini-ink); font-weight: 700; font-size: 14px; }
    .act ion-icon { color: var(--ion-color-primary); font-size: 19px; }
    .act.wa { background: #25d366; color: #fff; }
    .act.wa ion-icon { color: #fff; }
    .center { text-align: center; display: flex; gap: 6px; justify-content: center; align-items: center; }
  `,
})
export class AppointmentDetailPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly a = signal<Appointment | null>(null);

  readonly statusLabel = computed(() => (this.a() ? STATUS_LABELS[this.a()!.status] : ''));
  readonly statusColor = computed(() => (this.a() ? STATUS_COLORS[this.a()!.status] : ''));
  readonly cancellable = computed(() => {
    const a = this.a();
    return !!a && (a.status === 'pending' || a.status === 'confirmed') && new Date(a.startsAt).getTime() > Date.now();
  });
  readonly hint = computed(() => {
    switch (this.a()?.status) {
      case 'pending':
        return 'Ta demande est envoyée. Tu recevras un message dès que le prestataire la confirme.';
      case 'confirmed':
        return 'C’est confirmé ! Tu recevras un rappel la veille.';
      case 'declined':
        return 'Le prestataire n’est pas disponible à ce moment. Essaie un autre créneau.';
      case 'cancelled':
        return 'Ce rendez-vous a été annulé.';
      case 'completed':
        return 'Rendez-vous terminé. Merci d’avoir utilisé Ɲini !';
      case 'no_show':
        return 'Ce rendez-vous a été marqué comme manqué.';
      default:
        return '';
    }
  });
  readonly wa = computed(() => {
    const a = this.a();
    const phone = a?.provider.whatsapp ?? a?.provider.phone;
    return a && phone ? whatsappLink(phone, `Bonjour, c'est au sujet de mon rendez-vous Ɲini (${a.serviceName}). `) : '';
  });
  readonly directions = computed(() => {
    const p = this.a()?.provider;
    return p ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : '';
  });

  async ngOnInit() {
    try {
      this.a.set(await this.api.get<Appointment>(`/appointments/${this.id()}`));
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async cancel() {
    if (!(await this.ui.confirm('Annuler ce rendez-vous ?', 'Le prestataire sera prévenu.', 'Oui, annuler', true))) return;
    const updated = await this.ui.run(() => this.api.patch<Appointment>(`/me/appointments/${this.id()}/cancel`));
    if (updated) {
      this.a.set(updated);
      await this.ui.toast('Rendez-vous annulé');
    }
  }
}
