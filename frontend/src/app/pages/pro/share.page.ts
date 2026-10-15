import { Component, OnInit, inject, signal } from '@angular/core';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSkeletonText, IonTitle, IonToolbar } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { MyProvider, ShareInfo } from '../../core/models';

@Component({
  selector: 'app-share',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon, IonSkeletonText],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/pro/ma-page" /></ion-buttons>
        <ion-title>Partager</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-narrow">
        <h1>Remplis ton agenda</h1>
        <p class="muted">Publie tes disponibilités de la semaine en statut WhatsApp, en story Instagram ou sur TikTok. Tes clients réservent avec le lien.</p>

        @if (info(); as info) {
          <div class="visual card">
            @if (imageUrl()) {
              <img [src]="imageUrl()" alt="Mes disponibilités de la semaine" />
            } @else {
              <ion-skeleton-text [animated]="true" style="aspect-ratio: 4/5; margin: 0" />
            }
          </div>

          <div class="nets">
            <a class="net wa" [href]="waLink()" target="_blank" rel="noopener"><ion-icon name="logo-whatsapp" /><span>WhatsApp</span></a>
            <a class="net fb" [href]="fbLink()" target="_blank" rel="noopener"><ion-icon name="logo-facebook" /><span>Facebook</span></a>
            <button class="net ig" (click)="shareImage('Instagram')"><ion-icon name="logo-instagram" /><span>Instagram</span></button>
            <button class="net tt" (click)="shareImage('TikTok')"><ion-icon name="logo-tiktok" /><span>TikTok</span></button>
          </div>

          <ion-button expand="block" (click)="shareImage()"><ion-icon slot="start" name="share-social-outline" />Partager l'image</ion-button>
          <ion-button expand="block" fill="outline" (click)="download()"><ion-icon slot="start" name="download-outline" />Enregistrer l'image</ion-button>

          <div class="section-title"><h2>Mon lien de réservation</h2></div>
          <div class="link card">
            <ion-icon name="link-outline" />
            <span>{{ info.link }}</span>
            <button (click)="copy(info.link, 'Lien copié')" aria-label="Copier"><ion-icon name="copy-outline" /></button>
          </div>
          <p class="muted small">Mets-le dans ta bio Instagram, TikTok ou Facebook.</p>
        } @else {
          <ion-skeleton-text [animated]="true" style="height: 420px; border-radius: 18px" />
        }

        @if (code()) {
          <div class="section-title"><h2>Parraine un ami prestataire</h2></div>
          <div class="referral card">
            <ion-icon name="gift-outline" />
            <div>
              <p>Donne ce code à un coiffeur, une couturière, un plombier… qui s'inscrit sur Ɲini.</p>
              <button class="code" (click)="copy(code()!, 'Code copié')">{{ code() }} <ion-icon name="copy-outline" /></button>
            </div>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: `
    h1 { font-size: 26px; margin: 8px 0 6px; }
    .visual { padding: 0; overflow: hidden; margin: 18px 0 14px; }
    .visual img { display: block; width: 100%; }
    .nets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .net { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 4px; border-radius: 14px; color: #fff; text-decoration: none;
      font: inherit; font-weight: 700; font-size: 12px; cursor: pointer; }
    .net ion-icon { font-size: 24px; }
    .wa { background: #25d366; }
    .fb { background: #1877f2; }
    .ig { background: linear-gradient(45deg, #f58529, #dd2a7b, #8134af); }
    .tt { background: #111; }
    ion-button { margin-bottom: 8px; }
    .link { display: flex; align-items: center; gap: 10px; }
    .link span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 14px; }
    .link ion-icon { color: var(--ion-color-primary); font-size: 20px; flex: 0 0 auto; }
    .link button { background: none; cursor: pointer; }
    .referral { display: flex; gap: 14px; background: #fff6ef; box-shadow: none; border: 1px solid #f6d9c3; }
    .referral > ion-icon { font-size: 30px; color: var(--ion-color-primary); flex: 0 0 auto; }
    .referral p { margin: 0 0 10px; font-size: 14px; }
    .code { font: inherit; font-size: 22px; font-weight: 800; letter-spacing: .12em; background: #fff; border: 2px dashed var(--ion-color-primary);
      color: var(--ion-color-primary); padding: 8px 14px; border-radius: 12px; cursor: pointer; display: inline-flex; gap: 8px; align-items: center; }
    .code ion-icon { font-size: 16px; }
  `,
})
export class SharePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly info = signal<ShareInfo | null>(null);
  readonly imageUrl = signal<string | null>(null);
  readonly code = signal<string | null>(null);
  readonly waLink = signal('');
  readonly fbLink = signal('');
  private image?: Blob;

  async ngOnInit() {
    try {
      const [info, me] = await Promise.all([this.api.get<ShareInfo>('/me/provider/share'), this.api.get<MyProvider>('/me/provider')]);
      this.info.set(info);
      this.code.set(me.referralCode);
      this.waLink.set(`https://wa.me/?text=${encodeURIComponent(info.text)}`);
      this.fbLink.set(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(info.link)}`);
      // On télécharge l'image une fois : elle sert pour l'aperçu et pour le partage.
      this.image = await this.api.blob(info.imagePath, { v: Date.now() });
      this.imageUrl.set(URL.createObjectURL(this.image));
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async shareImage(network?: string) {
    const info = this.info();
    if (!info || !this.image) return;
    const file = new File([this.image], 'mes-disponibilites.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: info.text });
        return;
      }
      if ((await Share.canShare()).value && !network) {
        await Share.share({ text: info.text, url: info.link });
        return;
      }
    } catch {
      return; // partage annulé
    }
    // Instagram et TikTok ne prennent pas de lien direct : on enregistre l'image et on copie le texte.
    this.download();
    await navigator.clipboard?.writeText(info.text).catch(() => undefined);
    await this.ui.toast(`Image enregistrée et texte copié. Ouvre ${network ?? 'ton réseau'} et publie-la en story.`);
  }

  download() {
    const url = this.imageUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mes-disponibilites-nini.png';
    a.click();
  }

  async copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      await this.ui.toast(message, 'success');
    } catch {
      await this.ui.toast(text);
    }
  }
}
