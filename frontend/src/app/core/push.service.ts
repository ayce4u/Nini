import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { ApiService } from './api.service';

/** Notifications sur l'iPhone : demande l'autorisation et envoie le jeton à l'API. */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private started = false;

  async start() {
    if (this.started || !Capacitor.isNativePlatform()) return;
    this.started = true;
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.addListener('registration', (token) => {
      void this.api.post('/me/push-token', { token: token.value }).catch(() => undefined);
    });
    // Toucher une notification ouvre la bonne page de l'app.
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const link = action.notification.data?.link as string | undefined;
      if (link) void this.router.navigateByUrl(link);
    });
    await PushNotifications.register();
  }
}
