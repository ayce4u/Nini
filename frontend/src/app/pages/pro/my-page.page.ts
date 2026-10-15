import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonSkeletonText, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { MyProvider } from '../../core/models';
import { StarsComponent } from '../../shared/stars.component';

@Component({
  selector: 'app-my-page',
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonNote, IonSkeletonText, StarsComponent],
  template: `
    <ion-header class="ion-no-border"><ion-toolbar><ion-title>Ma page</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <div class="page-narrow">
        @if (p(); as p) {
          <div class="preview card">
            <div class="cover" [style.background-image]="cover() ? 'url(' + cover() + ')' : null">
              @if (!cover()) { <ion-icon [name]="p.category?.icon ?? 'storefront-outline'" /> }
            </div>
            <div class="info">
              <h2>{{ p.businessName }}</h2>
              <p class="muted small">{{ p.category?.name }} · {{ p.quartier || p.city }}</p>
              <nini-stars [value]="p.ratingAvg" [count]="p.ratingCount" />
            </div>
            <span class="badge" [class.success]="p.published" [class.danger]="!p.published">{{ p.published ? 'Visible' : 'Cachée' }}</span>
          </div>

          <div class="progress card">
            <div class="bar"><span [style.width.%]="completion()"></span></div>
            <p class="small"><strong>Page complète à {{ completion() }}&nbsp;%</strong>
              @if (completion() < 100) { · Une page complète reçoit beaucoup plus de réservations. }</p>
          </div>

          <ion-button expand="block" fill="outline" [routerLink]="['/prestataire', p.id]">
            <ion-icon slot="start" name="eye-outline" />Voir ma page comme un client
          </ion-button>

          <ion-list [inset]="true" class="menu">
            <ion-item [button]="true" [detail]="true" routerLink="/pro/profil/infos">
              <ion-icon slot="start" name="information-circle-outline" />
              <ion-label>Infos et localisation<p>Nom, catégorie, description, GPS</p></ion-label>
            </ion-item>
            <ion-item [button]="true" [detail]="true" routerLink="/pro/profil/services">
              <ion-icon slot="start" name="cash-outline" />
              <ion-label>Services et prix<p>{{ activeServices() }} service{{ activeServices() > 1 ? 's' : '' }} en ligne</p></ion-label>
            </ion-item>
            <ion-item [button]="true" [detail]="true" routerLink="/pro/profil/photos">
              <ion-icon slot="start" name="images-outline" />
              <ion-label>Photos<p>{{ p.photos.length }} photo{{ p.photos.length > 1 ? 's' : '' }}</p></ion-label>
              @if (!p.photos.length) { <ion-note slot="end" color="danger">À ajouter</ion-note> }
            </ion-item>
            <ion-item [button]="true" [detail]="true" routerLink="/pro/profil/horaires">
              <ion-icon slot="start" name="time-outline" />
              <ion-label>Horaires d'ouverture<p>Jours, heures et durée entre deux créneaux</p></ion-label>
            </ion-item>
          </ion-list>

          <ion-list [inset]="true" class="menu">
            <ion-item [button]="true" [detail]="true" routerLink="/pro/profil/partage">
              <ion-icon slot="start" name="share-social-outline" />
              <ion-label>Partager mon planning<p>WhatsApp, Facebook, Instagram, TikTok</p></ion-label>
            </ion-item>
            <ion-item [button]="true" [detail]="true" routerLink="/pro/profil/agenda">
              <ion-icon slot="start" name="logo-google" />
              <ion-label>Synchroniser mon agenda<p>Google Agenda, Outlook, iPhone</p></ion-label>
            </ion-item>
            <ion-item [button]="true" [detail]="true" routerLink="/pro/avis">
              <ion-icon slot="start" name="star-outline" />
              <ion-label>Avis des clients<p>{{ p.ratingCount }} avis · répondre</p></ion-label>
            </ion-item>
          </ion-list>
        } @else {
          <ion-skeleton-text [animated]="true" style="height: 110px; border-radius: 18px" />
          <ion-skeleton-text [animated]="true" style="height: 260px; border-radius: 18px; margin-top: 14px" />
        }
      </div>
    </ion-content>
  `,
  styles: `
    .preview { display: flex; align-items: center; gap: 14px; position: relative; }
    .cover { width: 76px; height: 76px; border-radius: 16px; background: var(--nini-gradient) center / cover; display: grid; place-items: center;
      color: #fff; font-size: 32px; flex: 0 0 auto; }
    .info h2 { margin: 0 0 2px; font-size: 19px; }
    .info p { margin: 0 0 4px; }
    .preview .badge { position: absolute; top: 12px; right: 12px; }
    .progress { margin: 12px 0; }
    .progress p { margin: 8px 0 0; }
    .bar { height: 8px; background: var(--nini-sand); border-radius: 99px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--ion-color-secondary); border-radius: 99px; transition: width .4s; }
    .menu { margin: 14px 0; border-radius: 18px; }
    .menu ion-icon { color: var(--ion-color-primary); }
  `,
})
export class MyPagePage implements ViewWillEnter {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly p = signal<MyProvider | null>(null);

  readonly cover = computed(() => {
    const photos = this.p()?.photos ?? [];
    return (photos.find((x) => x.isCover) ?? photos[0])?.url ?? null;
  });
  readonly activeServices = computed(() => this.p()?.services.filter((s) => s.active).length ?? 0);
  readonly completion = computed(() => {
    const p = this.p();
    if (!p) return 0;
    const checks = [
      !!p.description,
      p.photos.length > 0,
      p.photos.length >= 3,
      this.activeServices() > 0,
      p.lat != null,
      !!p.landmark,
      Object.values(p.weeklyHours).some((d) => d.length),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  });

  async ionViewWillEnter() {
    try {
      this.p.set(await this.api.get<MyProvider>('/me/provider'));
    } catch (err) {
      await this.ui.error(err);
    }
  }
}
