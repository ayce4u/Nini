import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { CatalogService } from '../../core/catalog.service';
import { UiService } from '../../core/ui.service';
import { LocationPickerComponent } from '../../shared/location-picker.component';

interface NewService {
  name: string;
  priceFcfa: number | null;
  durationMinutes: number;
}

/** Idées de services selon la catégorie, pour aller plus vite. */
const SUGGESTIONS: Record<string, NewService[]> = {
  coiffure: [
    { name: 'Tresses africaines', priceFcfa: 15000, durationMinutes: 180 },
    { name: 'Coupe homme', priceFcfa: 2000, durationMinutes: 30 },
    { name: 'Pose de mèches', priceFcfa: 10000, durationMinutes: 120 },
  ],
  beaute: [
    { name: 'Maquillage soirée', priceFcfa: 10000, durationMinutes: 60 },
    { name: 'Pose de henné', priceFcfa: 5000, durationMinutes: 90 },
  ],
  couture: [
    { name: 'Couture d’un boubou', priceFcfa: 15000, durationMinutes: 60 },
    { name: 'Retouche', priceFcfa: 2000, durationMinutes: 30 },
  ],
  plomberie: [
    { name: 'Réparation de fuite', priceFcfa: 5000, durationMinutes: 60 },
    { name: 'Installation d’un robinet', priceFcfa: 7500, durationMinutes: 60 },
  ],
  electricite: [
    { name: 'Dépannage électrique', priceFcfa: 5000, durationMinutes: 60 },
    { name: 'Installation de prise', priceFcfa: 3000, durationMinutes: 30 },
  ],
  climatisation: [{ name: 'Entretien de climatiseur', priceFcfa: 10000, durationMinutes: 60 }],
  mecanique: [
    { name: 'Vidange moto', priceFcfa: 3500, durationMinutes: 30 },
    { name: 'Diagnostic voiture', priceFcfa: 10000, durationMinutes: 60 },
  ],
  menage: [{ name: 'Ménage complet', priceFcfa: 7500, durationMinutes: 180 }],
};

@Component({
  selector: 'app-register-provider',
  imports: [
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonProgressBar,
    IonFooter,
    LocationPickerComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="back()"><ion-icon slot="icon-only" name="arrow-back" /></ion-button>
        </ion-buttons>
        <ion-title>Étape {{ step() + 1 }} sur {{ steps.length }}</ion-title>
      </ion-toolbar>
      <ion-progress-bar [value]="(step() + 1) / steps.length" />
    </ion-header>

    <ion-content>
      <div class="page-narrow">
        <h1>{{ steps[step()].title }}</h1>
        <p class="muted lead">{{ steps[step()].text }}</p>

        @switch (step()) {
          @case (0) {
            <label class="form-label">Nom de votre activité</label>
            <ion-input class="nini-input" fill="outline" placeholder="Ex. Salon Awa Coiffure" [(ngModel)]="form.businessName" />

            <label class="form-label">Catégorie</label>
            <div class="cats">
              @for (c of catalog.categories(); track c.slug) {
                <button type="button" class="cat" [class.on]="form.categorySlug === c.slug" (click)="pickCategory(c.slug)">
                  <ion-icon [name]="c.icon" />
                  <span>{{ c.name }}</span>
                </button>
              }
            </div>

            <label class="form-label">Décrivez votre travail <span class="muted">(facultatif)</span></label>
            <ion-textarea class="nini-input" fill="outline" [autoGrow]="true" rows="3"
              placeholder="Ex. Spécialiste des tresses depuis 8 ans, je travaille avec des produits de qualité."
              [(ngModel)]="form.description" />
          }

          @case (1) {
            <label class="form-label">Quartier</label>
            <ion-select class="nini-input" fill="outline" interface="action-sheet" placeholder="Choisir" cancelText="Annuler"
              [(ngModel)]="form.quartier" (ionChange)="onQuartier()">
              @for (q of catalog.quartiers(); track q.name) {
                <ion-select-option [value]="q.name">{{ q.name }} · {{ q.commune }}</ion-select-option>
              }
            </ion-select>

            <label class="form-label">Position exacte</label>
            <nini-location-picker [(value)]="position" [fallback]="quartierCenter()" />

            <label class="form-label">Point de repère <span class="muted">(facultatif)</span></label>
            <ion-input class="nini-input" fill="outline" placeholder="Ex. En face de la pharmacie du marché" [(ngModel)]="form.landmark" />

            <div class="toggle card">
              <div>
                <strong>Je me déplace chez les clients</strong>
                <p class="muted small">Les clients pourront indiquer leur adresse en réservant.</p>
              </div>
              <ion-toggle [(ngModel)]="form.mobile" />
            </div>
          }

          @case (2) {
            @for (s of services(); track $index; let i = $index) {
              <div class="service card">
                <div class="row">
                  <ion-input class="nini-input" fill="outline" label="Service" labelPlacement="stacked" placeholder="Ex. Tresses"
                    [(ngModel)]="s.name" />
                  <button type="button" class="remove" (click)="removeService(i)" aria-label="Retirer"><ion-icon name="trash-outline" /></button>
                </div>
                <div class="grid two">
                  <ion-input class="nini-input" fill="outline" type="number" inputmode="numeric" label="Prix (FCFA)" labelPlacement="stacked"
                    [(ngModel)]="s.priceFcfa" />
                  <ion-select class="nini-input" fill="outline" label="Durée" labelPlacement="stacked" interface="popover" [(ngModel)]="s.durationMinutes">
                    @for (d of durations; track d.value) {
                      <ion-select-option [value]="d.value">{{ d.label }}</ion-select-option>
                    }
                  </ion-select>
                </div>
              </div>
            }
            <ion-button fill="clear" (click)="addService()"><ion-icon slot="start" name="add-circle-outline" />Ajouter un service</ion-button>
            @if (suggestions().length) {
              <p class="form-label">Suggestions</p>
              <div class="chips">
                @for (s of suggestions(); track s.name) {
                  <button type="button" class="chip" (click)="useSuggestion(s)">+ {{ s.name }}</button>
                }
              </div>
            }
          }

          @case (3) {
            @if (upgrade()) {
              <div class="card upgrade">
                <ion-icon name="person-circle-outline" />
                <p>Ta page sera liée à ton compte <strong>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</strong>
                  ({{ auth.user()?.phone }}). Tu gardes le même numéro et le même mot de passe.</p>
              </div>
            } @else {
            <div class="grid two">
              <div>
                <label class="form-label">Prénom</label>
                <ion-input class="nini-input" fill="outline" [(ngModel)]="form.firstName" autocomplete="given-name" />
              </div>
              <div>
                <label class="form-label">Nom</label>
                <ion-input class="nini-input" fill="outline" [(ngModel)]="form.lastName" autocomplete="family-name" />
              </div>
            </div>

            <label class="form-label">Numéro de téléphone</label>
            <ion-input class="nini-input" fill="outline" type="tel" inputmode="tel" placeholder="76 12 34 56" [(ngModel)]="form.phone">
              <span slot="start" class="prefix">🇲🇱 +223</span>
            </ion-input>

            <div class="toggle card">
              <div><strong>Mon WhatsApp est un autre numéro</strong></div>
              <ion-toggle [(ngModel)]="otherWhatsapp" />
            </div>
            @if (otherWhatsapp) {
              <label class="form-label">Numéro WhatsApp</label>
              <ion-input class="nini-input" fill="outline" type="tel" inputmode="tel" [(ngModel)]="form.whatsapp" />
            }

            <label class="form-label">Email <span class="muted">(facultatif)</span></label>
            <ion-input class="nini-input" fill="outline" type="email" [(ngModel)]="form.email" autocomplete="email" />

            <label class="form-label">Mot de passe <span class="muted">(6 caractères minimum)</span></label>
            <ion-input class="nini-input" fill="outline" type="password" [(ngModel)]="form.password" autocomplete="new-password">
              <ion-input-password-toggle slot="end" />
            </ion-input>
            }

            <label class="form-label">Code de parrainage <span class="muted">(si un prestataire vous en a donné un)</span></label>
            <ion-input class="nini-input" fill="outline" placeholder="Ex. K7M2QX" [(ngModel)]="form.referralCode" />

            @if (!upgrade()) {
              <p class="muted small">Vous avez déjà un compte&nbsp;? <a routerLink="/connexion">Se connecter</a></p>
            }
          }
        }
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <div class="sticky-footer page-narrow">
        <ion-button expand="block" (click)="next()" [disabled]="busy()">
          {{ step() === steps.length - 1 ? 'Créer ma page' : 'Continuer' }}
          <ion-icon slot="end" name="arrow-forward" />
        </ion-button>
      </div>
    </ion-footer>
  `,
  styles: `
    h1 { font-size: 27px; margin: 6px 0 6px; }
    .lead { margin: 0 0 22px; }
    .cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 18px; }
    .cat { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 14px; background: #fff; border-radius: 16px;
      border: 2px solid transparent; box-shadow: var(--nini-shadow); text-align: left; font-weight: 700; font-size: 13.5px; cursor: pointer; color: var(--nini-ink); }
    .cat ion-icon { font-size: 24px; color: var(--ion-color-primary); }
    .cat.on { border-color: var(--ion-color-primary); background: #fff6ef; }
    .toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 6px 0 16px; }
    .toggle p { margin: 4px 0 0; }
    .service { margin-bottom: 12px; padding-bottom: 2px; }
    .row { display: flex; gap: 8px; align-items: flex-start; }
    .row ion-input { flex: 1; }
    .remove { background: none; color: var(--ion-color-danger); font-size: 20px; padding: 14px 4px; cursor: pointer; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { background: #fff; border: 1px dashed var(--ion-color-primary); color: var(--ion-color-primary); font-weight: 700;
      padding: 8px 12px; border-radius: 99px; font-size: 13px; cursor: pointer; }
    .prefix { color: var(--nini-muted); font-weight: 600; margin-right: 8px; }
    a { color: var(--ion-color-primary); font-weight: 700; text-decoration: none; }
    .upgrade { display: flex; gap: 12px; align-items: center; margin-bottom: 18px; }
    .upgrade ion-icon { font-size: 34px; color: var(--ion-color-primary); flex: 0 0 auto; }
    .upgrade p { margin: 0; }
  `,
})
export class RegisterProviderPage implements OnInit {
  readonly catalog = inject(CatalogService);
  readonly auth = inject(AuthService);
  /** Client déjà connecté qui ouvre sa page : pas besoin de recréer un compte. */
  readonly upgrade = computed(() => this.auth.isLoggedIn() && !this.auth.isProvider());
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  readonly steps = [
    { title: 'Votre activité', text: 'Comment les clients vous reconnaîtront.' },
    { title: 'Où travaillez-vous ?', text: 'Votre position GPS permet aux clients proches de vous trouver.' },
    { title: 'Vos services et prix', text: 'Les clients voient vos prix avant de vous contacter. Vous pourrez les changer à tout moment.' },
    { title: 'Vos informations', text: 'Pour vous connecter et recevoir les demandes de rendez-vous.' },
  ];
  readonly durations = [15, 30, 45, 60, 90, 120, 180, 240, 300].map((v) => ({
    value: v,
    label: v < 60 ? `${v} min` : `${Math.floor(v / 60)} h${v % 60 ? ' ' + (v % 60) : ''}`,
  }));

  readonly step = signal(0);
  readonly busy = signal(false);
  readonly services = signal<NewService[]>([{ name: '', priceFcfa: null, durationMinutes: 60 }]);
  position: { lat: number; lng: number } | null = null;
  otherWhatsapp = false;

  form = {
    businessName: '',
    categorySlug: '',
    description: '',
    quartier: '',
    landmark: '',
    mobile: false,
    firstName: '',
    lastName: '',
    phone: '',
    whatsapp: '',
    email: '',
    password: '',
    referralCode: '',
  };

  readonly categorySlug = signal('');
  readonly suggestions = computed(() =>
    (SUGGESTIONS[this.categorySlug()] ?? []).filter((s) => !this.services().some((x) => x.name === s.name)),
  );
  readonly quartierName = signal('');
  readonly quartierCenter = computed(() => {
    const q = this.catalog.quartiers().find((x) => x.name === this.quartierName());
    return q ? { lat: q.lat, lng: q.lng } : { lat: 12.6392, lng: -8.0029 };
  });

  ngOnInit() {
    void this.catalog.load().catch((err) => this.ui.error(err));
  }

  pickCategory(slug: string) {
    this.form.categorySlug = slug;
    this.categorySlug.set(slug);
  }

  onQuartier() {
    this.quartierName.set(this.form.quartier);
  }

  addService() {
    this.services.update((list) => [...list, { name: '', priceFcfa: null, durationMinutes: 60 }]);
  }

  removeService(i: number) {
    this.services.update((list) => list.filter((_, idx) => idx !== i));
  }

  useSuggestion(s: NewService) {
    this.services.update((list) => [...list.filter((x) => x.name.trim()), { ...s }]);
  }

  back() {
    if (this.step() === 0) void this.router.navigateByUrl('/bienvenue');
    else this.step.update((s) => s - 1);
  }

  async next() {
    const error = this.validate();
    if (error) return this.ui.toast(error, 'danger');
    if (this.step() < this.steps.length - 1) {
      this.step.update((s) => s + 1);
      return;
    }
    await this.submit();
  }

  private validate(): string | null {
    const f = this.form;
    switch (this.step()) {
      case 0:
        if (f.businessName.trim().length < 2) return 'Indiquez le nom de votre activité.';
        if (!f.categorySlug) return 'Choisissez une catégorie.';
        return null;
      case 1:
        if (!f.quartier) return 'Choisissez votre quartier.';
        if (!this.position) return 'Placez votre lieu de travail sur la carte ou utilisez le GPS.';
        return null;
      case 2: {
        const filled = this.services().filter((s) => s.name.trim());
        if (!filled.length) return 'Ajoutez au moins un service.';
        if (filled.some((s) => s.priceFcfa == null || s.priceFcfa < 0)) return 'Indiquez le prix de chaque service.';
        return null;
      }
      default:
        if (this.upgrade()) return null;
        if (!f.firstName.trim() || !f.lastName.trim()) return 'Indiquez votre prénom et votre nom.';
        if (f.phone.replace(/\D/g, '').length < 8) return 'Numéro de téléphone invalide.';
        if (f.password.length < 6) return 'Le mot de passe doit faire au moins 6 caractères.';
        return null;
    }
  }

  private async submit() {
    const f = this.form;
    this.busy.set(true);
    try {
      const provider = {
          businessName: f.businessName,
          categorySlug: f.categorySlug,
          description: f.description || undefined,
          lat: this.position!.lat,
          lng: this.position!.lng,
          landmark: f.landmark || undefined,
          mobile: f.mobile,
          whatsapp: this.otherWhatsapp && f.whatsapp ? f.whatsapp : undefined,
          referralCode: f.referralCode || undefined,
          services: this.services()
            .filter((s) => s.name.trim())
            .map((s) => ({ name: s.name.trim(), priceFcfa: Number(s.priceFcfa), durationMinutes: s.durationMinutes })),
      };
      if (this.upgrade()) {
        await this.auth.becomeProvider({ quartier: f.quartier, provider });
      } else {
        await this.auth.register({
          role: 'provider',
          firstName: f.firstName,
          lastName: f.lastName,
          phone: f.phone,
          email: f.email || undefined,
          password: f.password,
          quartier: f.quartier,
          provider,
        });
      }
      await this.ui.toast('Votre page est créée ! Ajoutez maintenant des photos de votre travail.', 'success');
      await this.router.navigateByUrl('/pro/tableau', { replaceUrl: true });
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.busy.set(false);
    }
  }
}
