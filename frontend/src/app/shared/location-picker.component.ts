import { AfterViewInit, Component, ElementRef, OnDestroy, inject, input, model, signal, viewChild } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import type * as Leaflet from 'leaflet';
import { LocationService } from '../core/location.service';
import { UiService } from '../core/ui.service';

/**
 * Choix de la position exacte du lieu de travail : le bouton GPS place le point
 * là où se trouve le téléphone, puis on peut déplacer la carte pour l'ajuster.
 */
@Component({
  selector: 'nini-location-picker',
  imports: [IonButton, IonIcon, IonSpinner],
  template: `
    <div class="wrap">
      <div #map class="map"></div>
      <div class="pin"><div class="nini-pin"></div></div>
      <div class="hint">Déplace la carte pour placer le point exactement</div>
    </div>
    <ion-button expand="block" color="dark" (click)="useGps()" [disabled]="locating()">
      @if (locating()) {
        <ion-spinner name="crescent" />
      } @else {
        <ion-icon slot="start" name="locate-outline" />
      }
      Utiliser ma position GPS
    </ion-button>
    @if (value()) {
      <p class="coords muted small">
        Position enregistrée : {{ value()!.lat.toFixed(5) }}, {{ value()!.lng.toFixed(5) }}
        @if (accuracy()) { · précision environ {{ accuracy() }} m }
      </p>
    }
  `,
  styles: `
    .wrap { position: relative; border-radius: var(--nini-radius); overflow: hidden; margin-bottom: 12px; box-shadow: var(--nini-shadow); }
    .map { height: 300px; }
    .pin { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -100%); pointer-events: none; z-index: 500; }
    .hint {
      position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 500; background: rgba(29,26,22,.8);
      color: #fff; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 99px; white-space: nowrap;
    }
    .coords { text-align: center; margin: 8px 0 0; }
  `,
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  readonly value = model<{ lat: number; lng: number } | null>(null);
  readonly fallback = input<{ lat: number; lng: number }>({ lat: 12.6392, lng: -8.0029 });
  readonly locating = signal(false);
  readonly accuracy = signal<number | null>(null);

  private readonly location = inject(LocationService);
  private readonly ui = inject(UiService);
  private readonly el = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private map?: Leaflet.Map;

  async ngAfterViewInit() {
    const mod = await import('leaflet');
    const L = ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
    const start = this.value() ?? this.fallback();
    this.map = L.map(this.el().nativeElement, { zoomControl: false }).setView([start.lat, start.lng], this.value() ? 17 : 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.map.on('moveend', () => {
      const c = this.map!.getCenter();
      this.value.set({ lat: round(c.lat), lng: round(c.lng) });
    });
    setTimeout(() => this.map?.invalidateSize(), 250);
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  async useGps() {
    this.locating.set(true);
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20_000 });
      this.accuracy.set(Math.round(pos.coords.accuracy));
      this.value.set({ lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) });
      this.map?.setView([pos.coords.latitude, pos.coords.longitude], 18);
      void this.location.locate().catch(() => undefined);
    } catch {
      await this.ui.toast('Impossible d’obtenir ta position. Autorise la localisation, ou place le point sur la carte.', 'danger');
    } finally {
      this.locating.set(false);
    }
  }
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
