import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonToolbar,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { CatalogService } from '../../core/catalog.service';
import { LocationService } from '../../core/location.service';
import { UiService } from '../../core/ui.service';
import type { ProviderSummary, SearchResult } from '../../core/models';
import { ProviderCardComponent } from '../../shared/provider-card.component';
import { MapComponent, MapMarker } from '../../shared/map.component';
import { chooseLocation } from './location-sheet';

type Sort = 'distance' | 'rating' | 'price';

@Component({
  selector: 'app-search',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonSearchbar,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ProviderCardComponent,
    MapComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="page bar">
          <ion-searchbar [(ngModel)]="query" placeholder="Rechercher un service, un nom…" [debounce]="400"
            (ionInput)="refresh()" enterkeyhint="search" />
          <div class="filters">
            <button class="chip loc" (click)="pickLocation()">
              <ion-icon name="location" />{{ location.position()?.label ?? 'Bamako' }}
            </button>
            <button class="chip" [class.on]="!category()" (click)="setCategory(null)">Tout</button>
            @for (c of catalog.categories(); track c.slug) {
              <button class="chip" [class.on]="category() === c.slug" (click)="setCategory(c.slug)">
                <ion-icon [name]="c.icon" />{{ c.name }}
              </button>
            }
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page">
        <div class="controls">
          <ion-segment [value]="mode()" (ionChange)="mode.set($any($event.detail.value))">
            <ion-segment-button value="list"><ion-icon name="list-outline" /><ion-label>Liste</ion-label></ion-segment-button>
            <ion-segment-button value="map"><ion-icon name="map-outline" /><ion-label>Carte</ion-label></ion-segment-button>
          </ion-segment>
          <ion-select interface="popover" [value]="sort()" (ionChange)="setSort($any($event.detail.value))" aria-label="Trier">
            <ion-select-option value="distance">Plus proches</ion-select-option>
            <ion-select-option value="rating">Mieux notés</ion-select-option>
            <ion-select-option value="price">Moins chers</ion-select-option>
          </ion-select>
          <ion-select interface="popover" [value]="radius()" (ionChange)="setRadius($any($event.detail.value))" aria-label="Distance">
            <ion-select-option [value]="0">Toute la ville</ion-select-option>
            <ion-select-option [value]="1">À 1 km</ion-select-option>
            <ion-select-option [value]="3">À 3 km</ion-select-option>
            <ion-select-option [value]="5">À 5 km</ion-select-option>
            <ion-select-option [value]="10">À 10 km</ion-select-option>
          </ion-select>
        </div>

        <p class="count muted small">
          @if (!loading()) { {{ total() }} prestataire{{ total() > 1 ? 's' : '' }} trouvé{{ total() > 1 ? 's' : '' }} }
        </p>

        @if (mode() === 'map') {
          <nini-map [markers]="markers()" [me]="me()" height="calc(100vh - 290px)" (markerClick)="open($event)" />
        } @else {
          <div class="grid two">
            @for (p of results(); track p.id) {
              <nini-provider-card [provider]="p" />
            } @empty {
              @if (loading()) {
                @for (i of [1, 2, 3, 4]; track i) {
                  <ion-skeleton-text [animated]="true" style="height: 144px; border-radius: 18px; margin: 0" />
                }
              } @else {
                <div class="empty">
                  <ion-icon name="search-outline" />
                  <h3>Aucun résultat</h3>
                  <p>Essayez un autre mot, une autre catégorie ou une distance plus grande.</p>
                </div>
              }
            }
          </div>
          <ion-infinite-scroll [disabled]="results().length >= total()" (ionInfinite)="more($event)">
            <ion-infinite-scroll-content />
          </ion-infinite-scroll>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .bar { padding-top: 6px; padding-bottom: 4px; }
    ion-searchbar { padding: 0 0 8px; }
    .filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
    .filters::-webkit-scrollbar { display: none; }
    .chip { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 1px solid var(--nini-line);
      padding: 8px 12px; border-radius: 99px; font-size: 13px; font-weight: 700; color: var(--nini-ink); cursor: pointer; }
    .chip.on { background: var(--nini-ink); color: #fff; border-color: var(--nini-ink); }
    .chip.loc { background: rgba(232,118,43,.1); border-color: transparent; color: #b5561a; }
    .controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .controls ion-segment { flex: 1 1 200px; max-width: 280px; }
    .controls ion-select { background: #fff; border-radius: 12px; padding: 0 12px; min-height: 42px; font-weight: 600; font-size: 14px; }
    .count { margin: 12px 4px; min-height: 18px; }
  `,
})
export class SearchPage implements OnInit {
  readonly catalog = inject(CatalogService);
  readonly location = inject(LocationService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  private readonly sheets = inject(ActionSheetController);
  private readonly alerts = inject(AlertController);

  // Paramètres de l'adresse : /app/recherche?q=tresses&category=coiffure&view=map
  readonly q = input<string>();
  readonly view = input<string>();
  readonly categoryParam = input<string>(undefined, { alias: 'category' });

  query = '';
  readonly category = signal<string | null>(null);
  readonly sort = signal<Sort>('distance');
  readonly radius = signal(0);
  readonly mode = signal<'list' | 'map'>('list');
  readonly results = signal<ProviderSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  private page = 1;

  readonly me = computed(() => {
    const p = this.location.position();
    return p ? { lat: p.lat, lng: p.lng } : null;
  });
  readonly markers = computed<MapMarker[]>(() =>
    this.results()
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, title: p.businessName, subtitle: p.category?.name })),
  );

  ngOnInit() {
    this.query = this.q() ?? '';
    this.category.set(this.categoryParam() ?? null);
    if (this.view() === 'map') this.mode.set('map');
    void this.catalog.load().catch(() => undefined);
    void this.refresh();
  }

  setCategory(slug: string | null) {
    this.category.set(slug);
    void this.refresh();
  }

  setSort(sort: Sort) {
    this.sort.set(sort);
    void this.refresh();
  }

  setRadius(km: number) {
    this.radius.set(km);
    void this.refresh();
  }

  async pickLocation() {
    if (await chooseLocation(this.sheets, this.alerts, this.location, this.catalog, this.ui)) await this.refresh();
  }

  async refresh() {
    this.page = 1;
    this.loading.set(true);
    try {
      const res = await this.fetch();
      this.results.set(res.items);
      this.total.set(res.total);
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  async more(event: CustomEvent) {
    this.page++;
    try {
      const res = await this.fetch();
      this.results.update((list) => [...list, ...res.items]);
    } finally {
      await (event.target as HTMLIonInfiniteScrollElement).complete();
    }
  }

  open(id: string) {
    void this.router.navigate(['/prestataire', id]);
  }

  private fetch() {
    const pos = this.location.position();
    // Avec une carte, on charge plus de prestataires d'un coup.
    return this.api.get<SearchResult>('/providers', {
      lat: pos?.lat,
      lng: pos?.lng,
      q: this.query.trim(),
      category: this.category(),
      sort: this.sort(),
      radiusKm: this.radius() || undefined,
      page: this.page,
      limit: this.mode() === 'map' ? 100 : 20,
    });
  }
}
