import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonInputPasswordToggle, IonToolbar } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { UiService } from '../../core/ui.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonButton, IonInput, IonIcon, IonInputPasswordToggle],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/bienvenue" /></ion-buttons></ion-toolbar>
    </ion-header>
    <ion-content>
      <form class="page-narrow" (ngSubmit)="submit()">
        <h1>Bon retour&nbsp;👋</h1>
        <p class="muted">Connecte-toi avec ton numéro de téléphone.</p>

        <label class="form-label" for="phone">Numéro de téléphone</label>
        <ion-input id="phone" class="nini-input" fill="outline" type="tel" inputmode="tel" placeholder="76 12 34 56"
          name="phone" [(ngModel)]="phone" autocomplete="tel" required>
          <span slot="start" class="prefix">🇲🇱 +223</span>
        </ion-input>

        <label class="form-label" for="password">Mot de passe</label>
        <ion-input id="password" class="nini-input" fill="outline" type="password" name="password" [(ngModel)]="password"
          autocomplete="current-password" required>
          <ion-input-password-toggle slot="end" />
        </ion-input>

        <ion-button expand="block" type="submit" [disabled]="busy()">Se connecter</ion-button>

        <p class="alt">Pas encore de compte&nbsp;?</p>
        <div class="grid two">
          <ion-button fill="outline" routerLink="/inscription/client"><ion-icon slot="start" name="search" />Client</ion-button>
          <ion-button fill="outline" color="tertiary" routerLink="/inscription/prestataire"><ion-icon slot="start" name="storefront" />Prestataire</ion-button>
        </div>
      </form>
    </ion-content>
  `,
  styles: `
    h1 { font-size: 30px; margin: 8px 0 6px; }
    p.muted { margin: 0 0 28px; }
    .prefix { color: var(--nini-muted); font-weight: 600; margin-right: 8px; }
    .alt { text-align: center; color: var(--nini-muted); margin: 28px 0 10px; }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  readonly returnUrl = input<string>();
  readonly busy = signal(false);
  phone = '';
  password = '';

  async submit() {
    if (!this.phone || !this.password) return this.ui.toast('Remplis ton numéro et ton mot de passe.', 'danger');
    this.busy.set(true);
    try {
      await this.auth.login(this.phone, this.password);
      await this.router.navigateByUrl(this.returnUrl() || this.auth.homeUrl(), { replaceUrl: true });
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.busy.set(false);
    }
  }
}
