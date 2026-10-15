import { ActionSheetController } from '@ionic/angular';
import { LocationService } from '../../core/location.service';
import { CatalogService } from '../../core/catalog.service';
import { UiService } from '../../core/ui.service';
import { AlertController } from '@ionic/angular';

/** Demande où chercher : position GPS du téléphone, ou un quartier. */
export async function chooseLocation(
  sheets: ActionSheetController,
  alerts: AlertController,
  location: LocationService,
  catalog: CatalogService,
  ui: UiService,
): Promise<boolean> {
  const sheet = await sheets.create({
    header: 'Où cherchez-vous ?',
    buttons: [
      { text: '📍 Utiliser ma position GPS', data: 'gps' },
      { text: '🏘️ Choisir un quartier', data: 'quartier' },
      { text: 'Annuler', role: 'cancel' },
    ],
  });
  await sheet.present();
  const { data } = await sheet.onDidDismiss();

  if (data === 'gps') {
    try {
      await location.locate();
      return true;
    } catch {
      await ui.toast('Position indisponible. Autorisez la localisation ou choisissez un quartier.', 'danger');
      return false;
    }
  }
  if (data === 'quartier') {
    await catalog.load();
    const alert = await alerts.create({
      header: 'Votre quartier',
      inputs: catalog.quartiers().map((q) => ({ type: 'radio' as const, label: `${q.name} · ${q.commune}`, value: q.name })),
      buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Valider', role: 'confirm' }],
    });
    await alert.present();
    const res = await alert.onDidDismiss();
    const q = catalog.quartiers().find((x) => x.name === res.data?.values);
    if (res.role === 'confirm' && q) {
      await location.useQuartier(q);
      return true;
    }
  }
  return false;
}
