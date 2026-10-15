import { AfterViewInit, Component, ElementRef, OnDestroy, effect, input, output, viewChild } from '@angular/core';
import type * as Leaflet from 'leaflet';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
}

/**
 * Carte OpenStreetMap (gratuite) avec les prestataires.
 * Leaflet n'est chargé qu'au moment d'afficher une carte, pour garder l'app rapide.
 */
@Component({
  selector: 'nini-map',
  template: `<div #map class="map" [style.height]="height()"></div>`,
  styles: `.map { width: 100%; background: var(--nini-sand); }`,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  readonly center = input<{ lat: number; lng: number }>({ lat: 12.6392, lng: -8.0029 });
  readonly zoom = input(13);
  readonly markers = input<MapMarker[]>([]);
  readonly me = input<{ lat: number; lng: number } | null>(null);
  readonly height = input('320px');
  readonly markerClick = output<string>();

  private readonly el = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private L?: typeof Leaflet;
  private map?: Leaflet.Map;
  private layer?: Leaflet.LayerGroup;

  constructor() {
    effect(() => {
      const markers = this.markers();
      const me = this.me();
      if (this.map) this.draw(markers, me);
    });
  }

  async ngAfterViewInit() {
    // Leaflet est un ancien module CommonJS : ses fonctions sont dans « default » une fois compilé.
    const mod = await import('leaflet');
    this.L = ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
    const L = this.L;
    this.map = L.map(this.el().nativeElement, { zoomControl: false, attributionControl: true }).setView(
      [this.center().lat, this.center().lng],
      this.zoom(),
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.draw(this.markers(), this.me());
    // La carte est parfois créée avant que la page ait sa taille finale.
    setTimeout(() => this.map?.invalidateSize(), 250);
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  private draw(markers: MapMarker[], me: { lat: number; lng: number } | null) {
    const L = this.L!;
    this.layer!.clearLayers();
    const pin = L.divIcon({ className: '', html: '<div class="nini-pin"></div>', iconSize: [34, 34], iconAnchor: [17, 34] });
    const points: Leaflet.LatLngExpression[] = [];
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], { icon: pin, title: m.title }).addTo(this.layer!);
      marker.bindTooltip(`<strong>${escapeHtml(m.title)}</strong>${m.subtitle ? '<br>' + escapeHtml(m.subtitle) : ''}`, {
        direction: 'top',
        offset: [0, -30],
      });
      marker.on('click', () => this.markerClick.emit(m.id));
      points.push([m.lat, m.lng]);
    }
    if (me) {
      L.marker([me.lat, me.lng], {
        icon: L.divIcon({ className: '', html: '<div class="nini-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        interactive: false,
      }).addTo(this.layer!);
      points.push([me.lat, me.lng]);
    }
    if (points.length > 1) this.map!.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    else if (points.length === 1) this.map!.setView(points[0], 15);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
