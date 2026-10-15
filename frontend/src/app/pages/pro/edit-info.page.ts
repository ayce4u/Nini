import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { CatalogService } from '../../core/catalog.service';
import { UiService } from '../../core/ui.service';
import type { MyProvider } from '../../core/models';
import { LocationPickerComponent } from '../../shared/location-picker.component';

@Component({
  selector: 'app-edit-info',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonFooter,
    IonButton,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonSkeletonText,
    LocationPickerComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/pro/ma-page" /></ion-buttons>
        <ion-title>Infos et localisation</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (loaded()) {
        <div class="page-narrow">
          <div class="toggle card">
            <div>
              <strong>Page visible par les clients</strong>
              <p class="muted small">Désactive-la pendant tes congés si tu ne veux pas être trouvé.</p>
            </div>
            <ion-toggle [(ngModel)]="form.published" />
          </div>

          <label class="form-label">Nom de l'activité</label>
          <ion-input class="nini-input" fill="outline" [(ngModel)]="form.businessName" [maxlength]="120" />

          <label class="form-label">Catégorie</label>
          <ion-select class="nini-input" fill="outline" interface="action-sheet" cancelText="Annuler" [(ngModel)]="form.categorySlug">
            @for (c of catalog.categories(); track c.slug) {
              <ion-select-option [value]="c.slug">{{ c.name }}</ion-select-option>
            }
          </ion-select>

          <label class="form-label">Description</label>
          <ion-textarea class="nini-input" fill="outline" [autoGrow]="true" rows="4" [maxlength]="2000" [counter]="true"
            placeholder="Ton savoir-faire, ton expérience, ce qui te rend différent…" [(ngModel)]="form.description" />

          <label class="form-label">Numéro WhatsApp <span class="muted">(si différent de ton numéro)</span></label>
          <ion-input class="nini-input" fill="outline" type="tel" inputmode="tel" [(ngModel)]="form.whatsapp" placeholder="76 12 34 56" />

          <div class="toggle card">
            <div>
              <strong>Je me déplace chez les clients</strong>
              <p class="muted small">Les clients pourront indiquer leur adresse en réservant.</p>
            </div>
            <ion-toggle [(ngModel)]="form.mobile" />
          </div>

          <h2>Où travailles-tu&nbsp;?</h2>
          <label class="form-label">Quartier</label>
          <ion-select class="nini-input" fill="outline" interface="action-sheet" cancelText="Annuler" [(ngModel)]="form.quartier"
            (ionChange)="quartier.set(form.quartier)">
            @for (q of catalog.quartiers(); track q.name) {
              <ion-select-option [value]="q.name">{{ q.name }} · {{ q.commune }}</ion-select-option>
            }
          </ion-select>

          <label class="form-label">Position exacte</label>
          <p class="muted small">Va sur ton lieu de travail et touche « Ma position », ou déplace l'épingle sur la carte.</p>
          <nini-location-picker [(value)]="position" [fallback]="quartierCenter()" />

          <label class="form-label">Point de repère</label>
          <ion-input class="nini-input" fill="outline" [(ngModel)]="form.landmark" [maxlength]="200"
            placeholder="Ex. : à côté de la mosquée, portail bleu" />
          <div style="height: 90px"></div>
        </div>
      } @else {
        <div class="page-narrow"><ion-skeleton-text [animated]="true" style="height: 300px; border-radius: 18px" /></div>
      }
    </ion-content>
    <ion-footer class="ion-no-border">
      <div class="sticky-footer page-narrow"><ion-button expand="block" (click)="save()" [disabled]="!loaded()">Enregistrer</ion-button></div>
    </ion-footer>
  `,
  styles: `
    h2 { font-size: 19px; margin: 26px 0 10px; }
    .toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 18px; }
    .toggle p { margin: 4px 0 0; }
  `,
})
export class EditInfoPage implements OnInit {
  readonly catalog = inject(CatalogService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  readonly loaded = signal(false);
  readonly quartier = signal('');
  readonly quartierCenter = computed(() => {
    const q = this.catalog.quartiers().find((x) => x.name === this.quartier());
    return q ? { lat: q.lat, lng: q.lng } : { lat: 12.6392, lng: -8.0029 };
  });
  position: { lat: number; lng: number } | null = null;
  form = { businessName: '', categorySlug: '', description: '', whatsapp: '', mobile: false, quartier: '', landmark: '', published: true };

  async ngOnInit() {
    try {
      const [p] = await Promise.all([this.api.get<MyProvider>('/me/provider'), this.catalog.load()]);
      this.form = {
        businessName: p.businessName,
        categorySlug: p.category?.slug ?? '',
        description: p.description ?? '',
        whatsapp: p.whatsapp ?? '',
        mobile: p.mobile,
        quartier: p.quartier ?? '',
        landmark: p.landmark ?? '',
        published: p.published,
      };
      this.quartier.set(this.form.quartier);
      this.position = p.lat != null ? { lat: p.lat, lng: p.lng! } : null;
      this.loaded.set(true);
    } catch (err) {
      await this.ui.error(err);
    }
  }

  async save() {
    const f = this.form;
    if (f.businessName.trim().length < 2) return this.ui.toast('Indique le nom de ton activité.', 'danger');
    const ok = await this.ui.run(() =>
      this.api.patch('/me/provider', {
        businessName: f.businessName.trim(),
        categorySlug: f.categorySlug,
        description: f.description.trim(),
        whatsapp: f.whatsapp.trim(),
        mobile: f.mobile,
        quartier: f.quartier || undefined,
        landmark: f.landmark.trim(),
        published: f.published,
        ...(this.position ? { lat: this.position.lat, lng: this.position.lng } : {}),
      }),
    );
    if (ok) {
      await this.ui.toast('Modifications enregistrées', 'success');
      await this.router.navigateByUrl('/pro/ma-page');
    }
  }
}
