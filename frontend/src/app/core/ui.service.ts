import { Injectable, inject } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { errorMessage } from './api.service';

/** Petits messages, chargements et confirmations, au même style partout. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly toasts = inject(ToastController);
  private readonly loading = inject(LoadingController);
  private readonly alerts = inject(AlertController);

  async toast(message: string, color: 'success' | 'danger' | 'dark' = 'dark') {
    const t = await this.toasts.create({ message, color, duration: 2600, position: 'top', cssClass: 'nini-toast' });
    await t.present();
  }

  async error(err: unknown) {
    await this.toast(errorMessage(err), 'danger');
  }

  /** Affiche un chargement pendant une action, et l'erreur s'il y en a une. */
  async run<T>(action: () => Promise<T>, message = 'Un instant…'): Promise<T | undefined> {
    const l = await this.loading.create({ message, spinner: 'crescent' });
    await l.present();
    try {
      return await action();
    } catch (err) {
      await this.error(err);
      return undefined;
    } finally {
      await l.dismiss();
    }
  }

  async confirm(header: string, message: string, ok = 'Confirmer', danger = false): Promise<boolean> {
    const a = await this.alerts.create({
      header,
      message,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: ok, role: 'confirm', cssClass: danger ? 'alert-danger' : '' },
      ],
    });
    await a.present();
    const { role } = await a.onDidDismiss();
    return role === 'confirm';
  }
}
