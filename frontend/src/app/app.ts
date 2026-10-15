import { Component, effect, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { AuthService } from './core/auth.service';
import { PushService } from './core/push.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`,
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly push = inject(PushService);

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
      void SplashScreen.hide();
    }
    // Dès que la personne est connectée sur l'iPhone, on active les notifications.
    effect(() => {
      if (this.auth.isLoggedIn()) void this.push.start();
    });
  }
}
