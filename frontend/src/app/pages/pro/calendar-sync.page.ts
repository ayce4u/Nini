import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonTitle, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { MyProvider } from '../../core/models';

@Component({
  selector: 'app-calendar-sync',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonButton, IonIcon, IonInput],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/pro/ma-page" /></ion-buttons>
        <ion-title>Mon agenda</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-narrow">
        <div class="block card">
          <h2><ion-icon name="download-outline" /> Voir mes rendez-vous Ɲini dans mon agenda</h2>
          <p class="muted small">Tes rendez-vous confirmés s'affichent dans Google Agenda, Outlook ou l'agenda de l'iPhone, et se mettent à jour tout seuls.</p>
          @if (feedUrl()) {
            <div class="url">
              <span>{{ feedUrl() }}</span>
              <button (click)="copy(feedUrl())" aria-label="Copier"><ion-icon name="copy-outline" /></button>
            </div>
            <div class="grid two">
              <ion-button fill="outline" [href]="googleLink()" target="_blank"><ion-icon slot="start" name="logo-google" />Google Agenda</ion-button>
              <ion-button fill="outline" [href]="webcalLink()"><ion-icon slot="start" name="calendar-outline" />iPhone / Outlook</ion-button>
            </div>
            <p class="muted small">Garde ce lien pour toi : il donne accès à ton planning.</p>
          }
        </div>

        <div class="block card">
          <h2><ion-icon name="cloud-upload-outline" /> Bloquer les moments déjà pris dans un autre agenda</h2>
          <p class="muted small">Colle le lien « iCal secret » de ton Google Agenda (Paramètres → ton agenda → Adresse secrète au format iCal).
            Ɲini bloque ces moments pour que personne ne réserve dessus. Mise à jour toutes les 30 minutes.</p>
          <ion-input class="nini-input" fill="outline" [(ngModel)]="importUrl" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
          @if (current()) {
            <p class="small ok"><ion-icon name="checkmark-circle" /> Agenda relié</p>
            <div class="grid two">
              <ion-button (click)="sync()"><ion-icon slot="start" name="sync-outline" />Synchroniser</ion-button>
              <ion-button fill="clear" color="danger" (click)="unlink()">Retirer</ion-button>
            </div>
            @if (importUrl !== current()) {
              <ion-button expand="block" fill="outline" (click)="link()">Remplacer par ce lien</ion-button>
            }
          } @else {
            <ion-button expand="block" (click)="link()" [disabled]="!importUrl.trim()">Relier cet agenda</ion-button>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .block { margin-bottom: 14px; }
    h2 { font-size: 17px; margin: 0 0 6px; display: flex; gap: 8px; align-items: flex-start; }
    h2 ion-icon { color: var(--ion-color-primary); flex: 0 0 auto; margin-top: 2px; }
    .url { display: flex; align-items: center; gap: 8px; background: var(--nini-sand); padding: 10px 12px; border-radius: 12px; margin: 10px 0; }
    .url span { flex: 1; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .url button { background: none; font-size: 18px; cursor: pointer; color: var(--ion-color-primary); }
    .ok { color: var(--ion-color-secondary); font-weight: 700; display: flex; gap: 6px; align-items: center; }
  `,
})
export class CalendarSyncPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  readonly feedUrl = signal('');
  readonly current = signal<string | null>(null);
  importUrl = '';

  readonly webcalLink = computed(() => this.feedUrl().replace(/^https?:/, 'webcal:'));
  readonly googleLink = computed(() => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(this.webcalLink())}`);

  async ngOnInit() {
    try {
      const p = await this.api.get<MyProvider>('/me/provider');
      const absolute = new URL(this.api.url(p.calendarFeedPath), location.origin).toString();
      this.feedUrl.set(absolute);
      this.current.set(p.calendarImportUrl);
      this.importUrl = p.calendarImportUrl ?? '';
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async copy(text: string) {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    await this.ui.toast('Lien copié', 'success');
  }

  async link() {
    const res = await this.ui.run(() => this.api.post<{ imported: number }>('/me/provider/calendar-import', { url: this.importUrl.trim() }));
    if (res) {
      this.current.set(this.importUrl.trim());
      await this.ui.toast(`Agenda relié : ${res.imported} moment(s) bloqué(s).`, 'success');
    }
  }

  async sync() {
    const res = await this.ui.run(() => this.api.post<{ imported: number }>('/me/provider/calendar-import/sync'));
    if (res) await this.ui.toast(`À jour : ${res.imported} moment(s) bloqué(s).`, 'success');
  }

  async unlink() {
    if (!(await this.ui.confirm('Retirer cet agenda ?', 'Les moments importés seront débloqués.', 'Retirer', true))) return;
    await this.ui.run(() => this.api.delete('/me/provider/calendar-import'));
    this.current.set(null);
    this.importUrl = '';
  }
}
