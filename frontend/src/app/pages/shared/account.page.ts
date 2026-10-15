import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  IonButtons,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CatalogService } from '../../core/catalog.service';
import { UiService } from '../../core/ui.service';
import type { User } from '../../core/models';
import { initials } from '../../core/format';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-account',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonList,
    IonItem,
    IonLabel,
    IonModal,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>{{ auth.isLoggedIn() ? 'Mon compte' : 'Connexion' }}</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <div class="page-narrow">
        @if (auth.user(); as u) {
          <div class="me card">
            <span class="avatar">{{ initialsOf(u) }}</span>
            <div>
              <h2>{{ u.firstName }} {{ u.lastName }}</h2>
              <p class="muted small">{{ u.phone }}@if (u.email) { · {{ u.email }} }</p>
              <span class="badge" [class.primary]="u.role === 'provider'">{{ u.role === 'provider' ? 'Prestataire' : 'Client' }}</span>
            </div>
          </div>

          <ion-list [inset]="true" class="menu">
            <ion-item [button]="true" [detail]="true" (click)="editOpen.set(true)">
              <ion-icon slot="start" name="person-outline" /><ion-label>Mes informations</ion-label>
            </ion-item>
            <ion-item [button]="true" [detail]="true" (click)="passwordOpen.set(true)">
              <ion-icon slot="start" name="lock-closed-outline" /><ion-label>Changer mon mot de passe</ion-label>
            </ion-item>
            @if (u.role === 'provider') {
              <ion-item [button]="true" [detail]="true" routerLink="/pro/ma-page">
                <ion-icon slot="start" name="storefront-outline" /><ion-label>Ma page prestataire</ion-label>
              </ion-item>
              <ion-item [button]="true" [detail]="true" routerLink="/pro/profil/partage">
                <ion-icon slot="start" name="gift-outline" /><ion-label>Parrainer un autre prestataire</ion-label>
              </ion-item>
            } @else {
              <ion-item [button]="true" [detail]="true" routerLink="/app/rendez-vous">
                <ion-icon slot="start" name="calendar-outline" /><ion-label>Mes rendez-vous</ion-label>
              </ion-item>
              <ion-item [button]="true" [detail]="true" routerLink="/app/favoris">
                <ion-icon slot="start" name="heart-outline" /><ion-label>Mes favoris</ion-label>
              </ion-item>
            }
          </ion-list>

          @if (u.role !== 'provider') {
            <div class="promo card">
              <ion-icon name="storefront" />
              <div>
                <strong>Tu proposes un service&nbsp;?</strong>
                <p class="small">Coiffure, couture, plomberie… Crée ta page et reçois des réservations.</p>
                <ion-button size="small" color="light" routerLink="/inscription/prestataire">Créer ma page prestataire</ion-button>
              </div>
            </div>
          }

          <ion-list [inset]="true" class="menu">
            <ion-item [button]="true" [detail]="false" href="https://wa.me/22300000000" target="_blank">
              <ion-icon slot="start" name="chatbubble-ellipses-outline" /><ion-label>Nous contacter</ion-label>
            </ion-item>
            <ion-item [button]="true" [detail]="false" (click)="logout()">
              <ion-icon slot="start" name="log-out-outline" color="danger" /><ion-label color="danger">Se déconnecter</ion-label>
            </ion-item>
          </ion-list>
        } @else {
          <div class="guest">
            <div class="logo">Ɲ</div>
            <h1>Bienvenue sur {{ appName }}</h1>
            <p class="muted">Connecte-toi pour réserver, suivre tes rendez-vous et garder tes prestataires favoris.</p>
            <ion-button expand="block" routerLink="/connexion">Se connecter</ion-button>
            <ion-button expand="block" fill="outline" routerLink="/inscription/client">Créer un compte client</ion-button>
            <ion-button expand="block" fill="clear" color="tertiary" routerLink="/inscription/prestataire">
              <ion-icon slot="start" name="storefront-outline" />Je propose un service
            </ion-button>
          </div>
        }
        <p class="muted small center">{{ appName }} · version {{ version }}</p>
      </div>

      <!-- Modifier mes informations -->
      <ion-modal [isOpen]="editOpen()" (didDismiss)="editOpen.set(false)" (willPresent)="fillForm()">
        <ng-template>
          <ion-header><ion-toolbar>
            <ion-title>Mes informations</ion-title>
            <ion-buttons slot="end"><ion-button (click)="editOpen.set(false)">Fermer</ion-button></ion-buttons>
          </ion-toolbar></ion-header>
          <ion-content>
            <form class="page-narrow" (ngSubmit)="saveProfile()">
              <label class="form-label" for="fn">Prénom</label>
              <ion-input id="fn" class="nini-input" fill="outline" name="firstName" [(ngModel)]="form.firstName" />
              <label class="form-label" for="ln">Nom</label>
              <ion-input id="ln" class="nini-input" fill="outline" name="lastName" [(ngModel)]="form.lastName" />
              <label class="form-label" for="em">E-mail <span class="muted">(facultatif)</span></label>
              <ion-input id="em" class="nini-input" fill="outline" type="email" name="email" [(ngModel)]="form.email" />
              <label class="form-label" for="q">Mon quartier</label>
              <ion-select id="q" class="nini-input" fill="outline" name="quartier" [(ngModel)]="form.quartier" interface="action-sheet"
                placeholder="Choisir" cancelText="Annuler">
                @for (q of catalog.quartiers(); track q.name) {
                  <ion-select-option [value]="q.name">{{ q.name }}</ion-select-option>
                }
              </ion-select>
              <p class="muted small">Ton numéro de téléphone sert à te connecter : il ne peut pas être changé ici.</p>
              <ion-button expand="block" type="submit">Enregistrer</ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Mot de passe -->
      <ion-modal [isOpen]="passwordOpen()" (didDismiss)="passwordOpen.set(false)">
        <ng-template>
          <ion-header><ion-toolbar>
            <ion-title>Mot de passe</ion-title>
            <ion-buttons slot="end"><ion-button (click)="passwordOpen.set(false)">Fermer</ion-button></ion-buttons>
          </ion-toolbar></ion-header>
          <ion-content>
            <form class="page-narrow" (ngSubmit)="savePassword()">
              <label class="form-label" for="cur">Mot de passe actuel</label>
              <ion-input id="cur" class="nini-input" fill="outline" type="password" name="current" [(ngModel)]="current" autocomplete="current-password">
                <ion-input-password-toggle slot="end" />
              </ion-input>
              <label class="form-label" for="new">Nouveau mot de passe <span class="muted">(6 caractères minimum)</span></label>
              <ion-input id="new" class="nini-input" fill="outline" type="password" name="next" [(ngModel)]="next" autocomplete="new-password">
                <ion-input-password-toggle slot="end" />
              </ion-input>
              <ion-button expand="block" type="submit" [disabled]="next.length < 6 || !current">Changer</ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: `
    .me { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--nini-gradient); color: #fff; font-size: 24px; font-weight: 800;
      display: grid; place-items: center; flex: 0 0 auto; }
    .me h2 { margin: 0 0 2px; font-size: 20px; }
    .me p { margin: 0 0 6px; }
    .menu { margin: 14px 0; border-radius: 18px; }
    .menu ion-icon { color: var(--ion-color-primary); }
    .promo { display: flex; gap: 14px; background: var(--ion-color-tertiary); color: #fff; }
    .promo > ion-icon { font-size: 34px; flex: 0 0 auto; }
    .promo p { margin: 4px 0 10px; opacity: .9; }
    .guest { text-align: center; padding-top: 30px; }
    .logo { width: 84px; height: 84px; margin: 0 auto 16px; border-radius: 26px; background: var(--nini-gradient); color: #fff;
      display: grid; place-items: center; font-size: 46px; font-weight: 800; }
    .guest h1 { font-size: 26px; margin: 0 0 8px; }
    .guest p { margin: 0 0 24px; }
    .guest ion-button { margin-bottom: 8px; }
    .center { text-align: center; margin-top: 26px; }
  `,
})
export class AccountPage {
  readonly auth = inject(AuthService);
  readonly catalog = inject(CatalogService);
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);

  readonly appName = environment.appName;
  readonly version = '1.0.0';
  readonly editOpen = signal(false);
  readonly passwordOpen = signal(false);
  form = { firstName: '', lastName: '', email: '', quartier: '' };
  current = '';
  next = '';

  initialsOf(u: User) {
    return initials(`${u.firstName} ${u.lastName}`);
  }

  fillForm() {
    const u = this.auth.user();
    if (!u) return;
    this.form = { firstName: u.firstName, lastName: u.lastName, email: u.email ?? '', quartier: u.quartier ?? '' };
    void this.catalog.load().catch(() => undefined);
  }

  async saveProfile() {
    const ok = await this.ui.run(() =>
      this.api.patch<User>('/me', {
        firstName: this.form.firstName.trim(),
        lastName: this.form.lastName.trim(),
        email: this.form.email.trim() || undefined,
        quartier: this.form.quartier || undefined,
      }),
    );
    if (ok) {
      await this.auth.refresh();
      this.editOpen.set(false);
      await this.ui.toast('Informations enregistrées', 'success');
    }
  }

  async savePassword() {
    const ok = await this.ui.run(() => this.api.post('/me/password', { current: this.current, next: this.next }));
    if (ok) {
      this.current = this.next = '';
      this.passwordOpen.set(false);
      await this.ui.toast('Mot de passe changé', 'success');
    }
  }

  async logout() {
    if (await this.ui.confirm('Se déconnecter ?', 'Tu pourras te reconnecter avec ton numéro et ton mot de passe.', 'Se déconnecter')) {
      await this.auth.logout();
    }
  }
}
