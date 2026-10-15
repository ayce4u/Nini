import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

@Component({
  selector: 'app-pro-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="tableau"><ion-icon name="speedometer-outline" /><ion-label>Accueil</ion-label></ion-tab-button>
        <ion-tab-button tab="planning"><ion-icon name="calendar-outline" /><ion-label>Planning</ion-label></ion-tab-button>
        <ion-tab-button tab="stats"><ion-icon name="stats-chart-outline" /><ion-label>Revenus</ion-label></ion-tab-button>
        <ion-tab-button tab="ma-page"><ion-icon name="storefront-outline" /><ion-label>Ma page</ion-label></ion-tab-button>
        <ion-tab-button tab="compte"><ion-icon name="person-outline" /><ion-label>Compte</ion-label></ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class ProTabsPage {}
