import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import type { MyProvider, Photo } from '../../core/models';

@Component({
  selector: 'app-edit-photos',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon, IonSpinner],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/pro/ma-page" /></ion-buttons>
        <ion-title>Photos</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page-narrow">
        <p class="muted">Montre ton travail : coiffures réalisées, ton salon, tes créations… La photo <strong>principale</strong>
          apparaît dans les résultats de recherche.</p>

        <input #file type="file" accept="image/*" multiple hidden (change)="upload($event)" />
        <button class="add card" (click)="file.click()" [disabled]="uploading()">
          @if (uploading()) {
            <ion-spinner name="crescent" /> <span>Envoi en cours…</span>
          } @else {
            <ion-icon name="cloud-upload-outline" /> <span>Ajouter des photos</span>
          }
        </button>

        <div class="photos">
          @for (ph of photos(); track ph.id) {
            <div class="ph" [class.cover]="ph.isCover">
              <img [src]="ph.url" alt="" loading="lazy" />
              @if (ph.isCover) { <span class="tag">Principale</span> }
              <div class="tools">
                @if (!ph.isCover) {
                  <button (click)="setCover(ph)" title="Mettre en principale"><ion-icon name="star-outline" /></button>
                }
                <button (click)="remove(ph)" title="Supprimer"><ion-icon name="trash-outline" /></button>
              </div>
            </div>
          }
        </div>
        @if (!photos().length && !uploading()) {
          <p class="muted center">Aucune photo pour l'instant.</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .add { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 22px; border: 2px dashed var(--ion-color-primary);
      color: var(--ion-color-primary); font: inherit; font-weight: 800; cursor: pointer; background: #fff6ef; box-shadow: none; }
    .add ion-icon { font-size: 26px; }
    .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
    @media (min-width: 560px) { .photos { grid-template-columns: repeat(3, 1fr); } }
    .ph { position: relative; aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: var(--nini-sand); }
    .ph.cover { outline: 3px solid var(--ion-color-primary); outline-offset: -3px; }
    .ph img { width: 100%; height: 100%; object-fit: cover; }
    .tag { position: absolute; top: 8px; left: 8px; background: var(--ion-color-primary); color: #fff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 99px; }
    .tools { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 6px; }
    .tools button { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.94); display: grid; place-items: center; font-size: 17px;
      color: var(--nini-ink); cursor: pointer; }
    .center { text-align: center; margin-top: 18px; }
  `,
})
export class EditPhotosPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly file = viewChild.required<ElementRef<HTMLInputElement>>('file');
  readonly photos = signal<Photo[]>([]);
  readonly uploading = signal(false);

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    try {
      this.photos.set((await this.api.get<MyProvider>('/me/provider')).photos);
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async upload(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.uploading.set(true);
    try {
      for (const [i, f] of files.entries()) {
        if (f.size > 8 * 1024 * 1024) {
          await this.ui.toast(`${f.name} est trop lourde (8 Mo maximum).`, 'danger');
          continue;
        }
        const first = !this.photos().length && i === 0;
        await this.api.upload(`/me/provider/photos${first ? '?cover=true' : ''}`, f, f.name);
      }
      await this.reload();
      await this.ui.toast('Photos ajoutées', 'success');
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.uploading.set(false);
      this.file().nativeElement.value = '';
    }
  }

  async setCover(ph: Photo) {
    await this.ui.run(() => this.api.patch(`/me/provider/photos/${ph.id}/cover`));
    this.photos.update((list) => list.map((x) => ({ ...x, isCover: x.id === ph.id })));
  }

  async remove(ph: Photo) {
    if (!(await this.ui.confirm('Supprimer cette photo ?', 'Elle sera retirée de ta page.', 'Supprimer', true))) return;
    await this.ui.run(() => this.api.delete(`/me/provider/photos/${ph.id}`));
    await this.reload();
  }
}
