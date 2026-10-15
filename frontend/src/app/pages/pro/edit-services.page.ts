import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { MyProvider, Service } from '../../core/models';
import { DurationPipe, FcfaPipe, duration } from '../../core/format';

interface Draft {
  id?: string;
  name: string;
  description: string;
  priceFcfa: number | null;
  priceFrom: boolean;
  durationMinutes: number;
  active: boolean;
}

@Component({
  selector: 'app-edit-services',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonModal,
    FcfaPipe,
    DurationPipe,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/pro/ma-page" /></ion-buttons>
        <ion-title>Services et prix</ion-title>
        <ion-buttons slot="end"><ion-button (click)="edit()"><ion-icon slot="start" name="add" />Ajouter</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-narrow">
        <p class="muted small">Les clients voient ces prix et réservent directement. Touche un service pour le modifier.</p>
        @for (s of services(); track s.id) {
          <button class="svc card" [class.off]="!s.active" (click)="edit(s)">
            <div>
              <strong>{{ s.name }}</strong>
              <span class="muted small">{{ s.durationMinutes | duration }}@if (!s.active) { · masqué }</span>
            </div>
            <span class="price">{{ s.priceFrom ? 'dès ' : '' }}{{ s.priceFcfa | fcfa }}</span>
          </button>
        } @empty {
          <div class="empty">
            <ion-icon name="cash-outline" />
            <h3>Aucun service</h3>
            <p class="muted">Ajoute ce que tu proposes avec ton prix et le temps que ça prend.</p>
            <ion-button (click)="edit()">Ajouter un service</ion-button>
          </div>
        }
      </div>

      <ion-modal [isOpen]="!!draft()" (didDismiss)="draft.set(null)" [initialBreakpoint]="0.92" [breakpoints]="[0, 0.92]">
        <ng-template>
          @if (draft(); as d) {
            <ion-content>
              <form class="page-narrow" (ngSubmit)="save()">
                <h2>{{ d.id ? 'Modifier le service' : 'Nouveau service' }}</h2>
                <label class="form-label">Nom</label>
                <ion-input class="nini-input" fill="outline" name="name" [(ngModel)]="d.name" placeholder="Ex. : Tresses africaines" />
                <div class="grid two">
                  <div>
                    <label class="form-label">Prix (FCFA)</label>
                    <ion-input class="nini-input" fill="outline" type="number" inputmode="numeric" name="price" [(ngModel)]="d.priceFcfa" />
                  </div>
                  <div>
                    <label class="form-label">Durée</label>
                    <ion-select class="nini-input" fill="outline" interface="popover" name="duration" [(ngModel)]="d.durationMinutes">
                      @for (m of durations; track m) { <ion-select-option [value]="m">{{ label(m) }}</ion-select-option> }
                    </ion-select>
                  </div>
                </div>
                <div class="toggle">
                  <span>Prix « à partir de » <span class="muted small">(le prix final dépend du travail)</span></span>
                  <ion-toggle name="from" [(ngModel)]="d.priceFrom" />
                </div>
                <label class="form-label">Description <span class="muted">(facultatif)</span></label>
                <ion-textarea class="nini-input" fill="outline" name="desc" [autoGrow]="true" [maxlength]="500" [(ngModel)]="d.description" />
                @if (d.id) {
                  <div class="toggle">
                    <span>Visible par les clients</span>
                    <ion-toggle name="active" [(ngModel)]="d.active" />
                  </div>
                }
                <ion-button expand="block" type="submit">Enregistrer</ion-button>
                @if (d.id) {
                  <ion-button expand="block" fill="clear" color="danger" (click)="remove(d)">Supprimer ce service</ion-button>
                }
              </form>
            </ion-content>
          }
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: `
    .svc { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; text-align: left; font: inherit; color: inherit;
      margin-bottom: 8px; cursor: pointer; }
    .svc strong { display: block; }
    .svc.off { opacity: .55; }
    .price { font-weight: 800; white-space: nowrap; }
    h2 { margin: 6px 0 16px; font-size: 21px; }
    .toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 2px 0 16px; }
  `,
})
export class EditServicesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly services = signal<Service[]>([]);
  readonly draft = signal<Draft | null>(null);
  readonly durations = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480];

  async ngOnInit() {
    try {
      this.services.set((await this.api.get<MyProvider>('/me/provider')).services);
    } catch (err) {
      await this.ui.error(err);
    }
  }

  label(m: number) {
    return duration(m);
  }

  edit(s?: Service) {
    this.draft.set(
      s
        ? { id: s.id, name: s.name, description: s.description ?? '', priceFcfa: s.priceFcfa, priceFrom: s.priceFrom, durationMinutes: s.durationMinutes, active: s.active }
        : { name: '', description: '', priceFcfa: null, priceFrom: false, durationMinutes: 60, active: true },
    );
  }

  async save() {
    const d = this.draft();
    if (!d) return;
    if (d.name.trim().length < 2) return this.ui.toast('Indique le nom du service.', 'danger');
    if (d.priceFcfa == null || d.priceFcfa < 0) return this.ui.toast('Indique le prix.', 'danger');
    const body = {
      name: d.name.trim(),
      description: d.description.trim(),
      priceFcfa: Math.round(Number(d.priceFcfa)),
      priceFrom: d.priceFrom,
      durationMinutes: d.durationMinutes,
      active: d.active,
    };
    const saved = await this.ui.run(() =>
      d.id ? this.api.patch<Service>(`/me/provider/services/${d.id}`, body) : this.api.post<Service>('/me/provider/services', body),
    );
    if (saved) {
      this.services.update((list) => (d.id ? list.map((s) => (s.id === saved.id ? saved : s)) : [...list, saved]));
      this.draft.set(null);
      await this.ui.toast('Service enregistré', 'success');
    }
  }

  async remove(d: Draft) {
    if (!(await this.ui.confirm('Supprimer ce service ?', 'Il ne sera plus proposé aux clients. Ton historique est conservé.', 'Supprimer', true))) return;
    await this.ui.run(() => this.api.delete(`/me/provider/services/${d.id}`));
    this.services.update((list) => list.filter((s) => s.id !== d.id));
    this.draft.set(null);
  }
}
