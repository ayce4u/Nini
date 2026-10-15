import { Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-client-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="accueil"><ion-icon name="home-outline" /><ion-label>Accueil</ion-label></ion-tab-button>
        <ion-tab-button tab="recherche"><ion-icon name="search-outline" /><ion-label>Rechercher</ion-label></ion-tab-button>
        <ion-tab-button tab="rendez-vous"><ion-icon name="calendar-outline" /><ion-label>Rendez-vous</ion-label></ion-tab-button>
        <ion-tab-button tab="favoris"><ion-icon name="heart-outline" /><ion-label>Favoris</ion-label></ion-tab-button>
        <ion-tab-button tab="compte">
          <ion-icon name="person-outline" /><ion-label>{{ auth.isLoggedIn() ? 'Compte' : 'Connexion' }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class ClientTabsPage {
  readonly auth = inject(AuthService);
}
