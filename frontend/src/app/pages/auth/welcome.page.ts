import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

/** Choix du profil : chercher un service ou proposer un service. */
@Component({
  selector: 'app-welcome',
  imports: [IonContent, IonIcon, RouterLink],
  template: `
    <ion-content [fullscreen]="true">
      <div class="hero">
        <span class="logo">Ɲini</span>
        <h1>Bienvenue&nbsp;!</h1>
        <p>Que voulez-vous faire&nbsp;?</p>
      </div>
      <div class="page-narrow choices">
        <a class="choice" routerLink="/app/accueil">
          <span class="icon client"><ion-icon name="search" /></span>
          <span class="text">
            <strong>Je cherche un service</strong>
            <span>Trouver et réserver un prestataire près de chez moi</span>
          </span>
          <ion-icon name="chevron-forward" class="chev" />
        </a>
        <a class="choice" routerLink="/inscription/prestataire">
          <span class="icon pro"><ion-icon name="storefront" /></span>
          <span class="text">
            <strong>Je propose un service</strong>
            <span>Créer ma page, recevoir des clients et suivre mes revenus</span>
          </span>
          <ion-icon name="chevron-forward" class="chev" />
        </a>

        <p class="login">Vous avez déjà un compte&nbsp;? <a routerLink="/connexion">Se connecter</a></p>
      </div>
    </ion-content>
  `,
  styles: `
    .hero { background: var(--nini-gradient); color: #fff; padding: calc(48px + env(safe-area-inset-top)) 28px 72px;
      border-radius: 0 0 36px 36px; text-align: center; }
    .logo { font-size: 22px; font-weight: 800; opacity: .9; }
    h1 { font-size: 36px; margin: 22px 0 6px; }
    .hero p { font-size: 17px; margin: 0; opacity: .92; }
    .choices { margin-top: -44px; display: flex; flex-direction: column; gap: 14px; }
    .choice { display: flex; align-items: center; gap: 16px; background: #fff; border-radius: 22px; padding: 18px;
      box-shadow: var(--nini-shadow-lg); text-decoration: none; color: inherit; transition: transform .15s; }
    .choice:active { transform: scale(.98); }
    .icon { flex: 0 0 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; font-size: 28px; color: #fff; }
    .icon.client { background: var(--ion-color-primary); }
    .icon.pro { background: var(--ion-color-tertiary); }
    .text { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .text strong { font-size: 17px; }
    .text span { color: var(--nini-muted); font-size: 14px; line-height: 1.35; }
    .chev { color: var(--nini-muted); font-size: 20px; }
    .login { text-align: center; margin-top: 18px; color: var(--nini-muted); }
    .login a { color: var(--ion-color-primary); font-weight: 700; text-decoration: none; }
  `,
})
export class WelcomePage {}
