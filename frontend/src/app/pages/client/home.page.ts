import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActionSheetController, AlertController, IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSearchbar, IonSkeletonText } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CatalogService } from '../../core/catalog.service';
import { LocationService } from '../../core/location.service';
import { UiService } from '../../core/ui.service';
import type { ProviderSummary, SearchResult } from '../../core/models';
import { ProviderCardComponent } from '../../shared/provider-card.component';
import { StarsComponent } from '../../shared/stars.component';
import { DistancePipe } from '../../core/format';
import { chooseLocation } from './location-sheet';

@Component({
  selector: 'app-home',
  imports: [RouterLink, IonContent, IonIcon, IonSearchbar, IonSkeletonText, IonRefresher, IonRefresherContent, ProviderCardComponent, StarsComponent, DistancePipe],
  template: `
    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="reload($event)"><ion-refresher-content /></ion-refresher>

      <section class="hero">
        <div class="page">
          <div class="top">
            <div>
              <p class="hello">{{ greeting() }}{{ auth.user() ? ', ' + auth.user()!.firstName : '' }} 👋</p>
              <button class="where" (click)="pickLocation()">
                <ion-icon name="location" />
                <span>{{ location.position()?.label ?? 'Choisir ma position' }}</span>
                <ion-icon name="chevron-down" class="down" />
              </button>
            </div>
            <a class="avatar" routerLink="/app/compte" aria-label="Mon compte">
              <ion-icon name="person-circle-outline" />
            </a>
          </div>
          <h1>De quel service avez-vous besoin&nbsp;?</h1>
          <ion-searchbar placeholder="Tresses, plombier, couturier…" (keyup.enter)="search($any($event.target).value)"
            (ionClear)="0" [debounce]="0" enterkeyhint="search" />
        </div>
      </section>

      <div class="page">
        <div class="section-title"><h2>Catégories</h2><a routerLink="/app/recherche">Tout voir</a></div>
        <div class="cats">
          @for (c of catalog.categories(); track c.slug) {
            <a class="cat" [routerLink]="['/app/recherche']" [queryParams]="{ category: c.slug }">
              <span class="icon"><ion-icon [name]="c.icon" /></span>
              <span class="name">{{ c.name }}</span>
            </a>
          } @empty {
            @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
              <div class="cat"><ion-skeleton-text [animated]="true" style="width: 52px; height: 52px; border-radius: 16px" /></div>
            }
          }
        </div>

        <div class="section-title">
          <h2>Près de vous</h2>
          <a routerLink="/app/recherche" [queryParams]="{ view: 'map' }">Voir la carte</a>
        </div>
        <div class="grid two">
          @for (p of nearby(); track p.id) {
            <nini-provider-card [provider]="p" />
          } @empty {
            @if (loading()) {
              @for (i of [1, 2, 3, 4]; track i) {
                <ion-skeleton-text [animated]="true" style="height: 144px; border-radius: 18px; margin: 0" />
              }
            } @else {
              <div class="empty card">
                <ion-icon name="storefront-outline" />
                <h3>Pas encore de prestataire ici</h3>
                <p>Essayez une autre catégorie ou élargissez la recherche.</p>
              </div>
            }
          }
        </div>

        @if (topRated().length) {
          <div class="section-title"><h2>Les mieux notés</h2></div>
          <div class="hscroll">
            @for (p of topRated(); track p.id) {
              <a class="mini" [routerLink]="['/prestataire', p.id]">
                <div class="img" [style.background-image]="p.coverUrl ? 'url(' + p.coverUrl + ')' : null"></div>
                <strong>{{ p.businessName }}</strong>
                <span class="muted small">{{ p.category?.name }} · {{ p.distanceKm | distance }}</span>
                <nini-stars [value]="p.ratingAvg" [count]="p.ratingCount" [compact]="true" />
              </a>
            }
          </div>
        }

        @if (!auth.isProvider()) {
          <a class="pro-cta" routerLink="/inscription/prestataire">
            <div>
              <strong>Vous êtes prestataire&nbsp;?</strong>
              <span>Créez votre page gratuitement et recevez des clients de votre quartier.</span>
            </div>
            <ion-icon name="arrow-forward" />
          </a>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .hero { background: var(--nini-gradient); color: #fff; padding-top: env(safe-area-inset-top); border-radius: 0 0 30px 30px; }
    .hero .page { padding-bottom: 22px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; }
    .hello { margin: 6px 0 4px; font-weight: 600; opacity: .95; }
    .where { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.2); color: #fff; font-weight: 700;
      padding: 7px 12px; border-radius: 99px; font-size: 14px; cursor: pointer; }
    .where .down { font-size: 14px; }
    .avatar { color: #fff; font-size: 36px; }
    h1 { font-size: 26px; line-height: 1.2; margin: 18px 0 12px; max-width: 520px; }
    ion-searchbar { padding: 0; --placeholder-color: #8a8075; --icon-color: var(--ion-color-primary); }
    .cats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    @media (min-width: 720px) { .cats { grid-template-columns: repeat(8, 1fr); } }
    .cat { display: flex; flex-direction: column; align-items: center; gap: 6px; text-decoration: none; color: var(--nini-ink); text-align: center; }
    .cat .icon { width: 58px; height: 58px; border-radius: 18px; background: #fff; display: grid; place-items: center; font-size: 26px;
      color: var(--ion-color-primary); box-shadow: var(--nini-shadow); transition: transform .15s; }
    .cat:hover .icon { transform: translateY(-2px); }
    .cat .name { font-size: 11.5px; font-weight: 600; line-height: 1.2; }
    .hscroll { display: flex; gap: 12px; overflow-x: auto; padding: 4px 4px 12px; scroll-snap-type: x mandatory; }
    .mini { flex: 0 0 168px; scroll-snap-align: start; background: #fff; border-radius: 18px; padding: 8px; box-shadow: var(--nini-shadow);
      text-decoration: none; color: var(--nini-ink); display: flex; flex-direction: column; gap: 4px; }
    .mini .img { height: 110px; border-radius: 12px; background: var(--nini-gradient); background-size: cover; background-position: center; margin-bottom: 4px; }
    .mini strong { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pro-cta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 28px 0 24px; padding: 20px;
      border-radius: 22px; background: var(--nini-ink); color: #fff; text-decoration: none; }
    .pro-cta div { display: flex; flex-direction: column; gap: 4px; }
    .pro-cta span { opacity: .8; font-size: 14px; }
    .pro-cta ion-icon { font-size: 24px; color: var(--ion-color-primary); }
  `,
})
export class HomePage implements OnInit {
  readonly auth = inject(AuthService);
  readonly catalog = inject(CatalogService);
  readonly location = inject(LocationService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  private readonly sheets = inject(ActionSheetController);
  private readonly alerts = inject(AlertController);

  readonly nearby = signal<ProviderSummary[]>([]);
  readonly topRated = signal<ProviderSummary[]>([]);
  readonly loading = signal(true);

  ngOnInit() {
    void this.load();
  }

  greeting() {
    const h = new Date().getUTCHours();
    return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  }

  async load() {
    this.loading.set(true);
    const pos = this.location.position();
    try {
      await this.catalog.load();
      const [near, top] = await Promise.all([
        this.api.get<SearchResult>('/providers', { lat: pos?.lat, lng: pos?.lng, limit: 6 }),
        this.api.get<SearchResult>('/providers', { lat: pos?.lat, lng: pos?.lng, sort: 'rating', limit: 8 }),
      ]);
      this.nearby.set(near.items);
      this.topRated.set(top.items.filter((p) => p.ratingCount > 0));
    } catch (err) {
      await this.ui.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  async reload(event: CustomEvent) {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async pickLocation() {
    if (await chooseLocation(this.sheets, this.alerts, this.location, this.catalog, this.ui)) await this.load();
  }

  search(q: string) {
    void this.router.navigate(['/app/recherche'], { queryParams: { q: q || null } });
  }
}
