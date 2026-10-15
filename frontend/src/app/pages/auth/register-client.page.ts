import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonSelect,
  IonSelectOption,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { CatalogService } from '../../core/catalog.service';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'app-register-client',
  imports: [FormsModule, RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonInput, IonInputPasswordToggle, IonSelect, IonSelectOption],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/bienvenue" /></ion-buttons></ion-toolbar>
    </ion-header>
    <ion-content>
      <form class="page-narrow" (ngSubmit)="submit()">
        <h1>Créer mon compte</h1>
        <p class="muted">Pour réserver, suivre vos rendez-vous et garder vos prestataires favoris.</p>

        <div class="grid two">
          <div>
            <label class="form-label">Prénom</label>
            <ion-input class="nini-input" fill="outline" name="firstName" [(ngModel)]="form.firstName" autocomplete="given-name" />
          </div>
          <div>
            <label class="form-label">Nom</label>
            <ion-input class="nini-input" fill="outline" name="lastName" [(ngModel)]="form.lastName" autocomplete="family-name" />
          </div>
        </div>

        <label class="form-label">Numéro de téléphone</label>
        <ion-input class="nini-input" fill="outline" type="tel" inputmode="tel" placeholder="76 12 34 56" name="phone" [(ngModel)]="form.phone">
          <span slot="start" class="prefix">🇲🇱 +223</span>
        </ion-input>

        <label class="form-label">Email <span class="muted">(facultatif)</span></label>
        <ion-input class="nini-input" fill="outline" type="email" name="email" [(ngModel)]="form.email" autocomplete="email" />

        <label class="form-label">Votre quartier</label>
        <ion-select class="nini-input" fill="outline" interface="action-sheet" placeholder="Choisir" name="quartier" [(ngModel)]="form.quartier"
          cancelText="Annuler">
          @for (q of catalog.quartiers(); track q.name) {
            <ion-select-option [value]="q.name">{{ q.name }} · {{ q.commune }}</ion-select-option>
          }
        </ion-select>

        <label class="form-label">Mot de passe <span class="muted">(6 caractères minimum)</span></label>
        <ion-input class="nini-input" fill="outline" type="password" name="password" [(ngModel)]="form.password" autocomplete="new-password">
          <ion-input-password-toggle slot="end" />
        </ion-input>

        <ion-button expand="block" type="submit" [disabled]="busy()">Créer mon compte</ion-button>
        <p class="alt">Déjà inscrit&nbsp;? <a routerLink="/connexion">Se connecter</a></p>
      </form>
    </ion-content>
  `,
  styles: `
    h1 { font-size: 28px; margin: 8px 0 6px; }
    p.muted { margin: 0 0 24px; }
    .prefix { color: var(--nini-muted); font-weight: 600; margin-right: 8px; }
    .alt { text-align: center; color: var(--nini-muted); }
    .alt a { color: var(--ion-color-primary); font-weight: 700; text-decoration: none; }
  `,
})
export class RegisterClientPage implements OnInit {
  readonly catalog = inject(CatalogService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  readonly returnUrl = input<string>();
  readonly busy = signal(false);
  form = { firstName: '', lastName: '', phone: '', email: '', quartier: '', password: '' };

  ngOnInit() {
    void this.catalog.load().catch(() => undefined);
  }

  async submit() {
    const f = this.form;
    if (!f.firstName || !f.lastName || !f.phone) return this.ui.toast('Prénom, nom et téléphone sont obligatoires.', 'danger');
    if (f.password.length < 6) return this.ui.toast('Le mot de passe doit faire au moins 6 caractères.', 'danger');
    this.busy.set(true);
    try {
      await this.auth.register({ ...f, email: f.email || undefined, quartier: f.quartier || undefined, role: 'client' });
      await this.ui.toast('Bienvenue sur Ɲini !', 'success');
      await this.router.navigateByUrl(this.returnUrl() || '/app/accueil', { replaceUrl: true });
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.busy.set(false);
    }
  }
}
