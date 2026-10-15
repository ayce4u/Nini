import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonSkeletonText, IonToolbar } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LocationService, distanceKm } from '../../core/location.service';
import { UiService } from '../../core/ui.service';
import { WEEKDAYS, type ProviderDetail, type Service } from '../../core/models';
import { DistancePipe, DurationPipe, FcfaPipe, FrDatePipe, initials, whatsappLink } from '../../core/format';
import { StarsComponent } from '../../shared/stars.component';
import { MapComponent } from '../../shared/map.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-provider-detail',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSkeletonText,
    StarsComponent,
    MapComponent,
    FcfaPipe,
    DurationPipe,
    DistancePipe,
    FrDatePipe,
  ],
  template: `
    <ion-header class="ion-no-border floating">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/app/recherche" class="round-btn" /></ion-buttons>
        <ion-buttons slot="end">
          <ion-button class="round-btn" (click)="share()" aria-label="Partager"><ion-icon slot="icon-only" name="share-social-outline" /></ion-button>
          <ion-button class="round-btn" (click)="toggleFavorite()" aria-label="Favori">
            <ion-icon slot="icon-only" [name]="favorite() ? 'heart' : 'heart-outline'" [class.fav]="favorite()" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      @if (p(); as p) {
        <div class="gallery">
          @for (ph of p.photos; track ph.id) {
            <img [src]="ph.url" [alt]="p.businessName" loading="lazy" />
          } @empty {
            <div class="placeholder"><span>{{ initialsOf() }}</span></div>
          }
        </div>

        <div class="page sheet">
          <div class="head card">
            <span class="category"><ion-icon [name]="p.category?.icon ?? 'grid-outline'" /> {{ p.category?.name }}</span>
            <h1>
              {{ p.businessName }}
              @if (p.verified) { <ion-icon name="shield-checkmark" class="verified" title="Vérifié" /> }
            </h1>
            <div class="meta">
              <nini-stars [value]="p.ratingAvg" [count]="p.ratingCount" />
              <span><ion-icon name="location-outline" />{{ p.quartier || p.city }}@if (distance() != null) { · {{ distance() | distance }} }</span>
            </div>
            @if (p.mobile) { <span class="badge primary">Se déplace à domicile</span> }
            <div class="actions">
              <a class="act wa" [href]="wa()" target="_blank" rel="noopener"><ion-icon name="logo-whatsapp" /><span>WhatsApp</span></a>
              <a class="act" [href]="'tel:' + p.phone"><ion-icon name="call" /><span>Appeler</span></a>
              <a class="act" [href]="directions()" target="_blank" rel="noopener"><ion-icon name="navigate-outline" /><span>Itinéraire</span></a>
            </div>
          </div>

          <div class="section-title"><h2>Services et prix</h2></div>
          <div class="card list">
            @for (s of p.services; track s.id) {
              <div class="service">
                <div>
                  <strong>{{ s.name }}</strong>
                  <span class="muted small"><ion-icon name="time-outline" /> {{ s.durationMinutes | duration }}</span>
                  @if (s.description) { <p class="muted small">{{ s.description }}</p> }
                </div>
                <div class="right">
                  <span class="price">{{ s.priceFrom ? 'dès ' : '' }}{{ s.priceFcfa | fcfa }}</span>
                  <ion-button size="small" (click)="book(s)">Réserver</ion-button>
                </div>
              </div>
            } @empty {
              <p class="muted">Ce prestataire n'a pas encore ajouté de services.</p>
            }
          </div>

          @if (p.description || p.landmark) {
            <div class="section-title"><h2>À propos</h2></div>
            <div class="card">
              @if (p.description) { <p class="about">{{ p.description }}</p> }
              @if (p.landmark) { <p class="muted"><ion-icon name="location-outline" /> {{ p.landmark }}</p> }
              <p class="muted small">Sur Ɲini depuis {{ p.memberSince | frDate: 'short' }}</p>
            </div>
          }

          <div class="grid two">
            <div>
              <div class="section-title"><h2>Horaires</h2></div>
              <div class="card hours">
                @for (d of weekdays; track d.key) {
                  <div class="day" [class.today]="d.key === today">
                    <span>{{ d.label }}</span>
                    <span>
                      @for (r of p.weeklyHours[d.key]; track $index; let last = $last) {
                        {{ r.start.replace(':', 'h') }}–{{ r.end.replace(':', 'h') }}@if (!last) {, }
                      } @empty {
                        <span class="muted">Fermé</span>
                      }
                    </span>
                  </div>
                }
              </div>
            </div>
            <div>
              <div class="section-title"><h2>Localisation</h2></div>
              @if (p.lat != null) {
                <nini-map [markers]="[{ id: p.id, lat: p.lat!, lng: p.lng!, title: p.businessName }]" [me]="me()" height="290px" />
              }
            </div>
          </div>

          <div class="section-title"><h2>Avis ({{ p.ratingCount }})</h2></div>
          <div class="reviews">
            @for (r of p.reviews; track r.id) {
              <div class="card review">
                <div class="r-head">
                  <span class="avatar">{{ r.author[0] }}</span>
                  <div>
                    <strong>{{ r.author }}</strong>
                    <nini-stars [value]="r.rating" [compact]="true" />
                  </div>
                  <span class="muted small date">{{ r.createdAt | frDate: 'short' }}</span>
                </div>
                @if (r.comment) { <p>{{ r.comment }}</p> }
                @if (r.reply) { <p class="reply"><strong>Réponse :</strong> {{ r.reply }}</p> }
              </div>
            } @empty {
              <p class="muted">Pas encore d'avis. Réservez et soyez le premier à donner votre avis&nbsp;!</p>
            }
          </div>
          <div style="height: 90px"></div>
        </div>
      } @else {
        <ion-skeleton-text [animated]="true" style="height: 280px; margin: 0" />
        <div class="page"><ion-skeleton-text [animated]="true" style="height: 180px; border-radius: 18px" /></div>
      }
    </ion-content>

    @if (p()) {
      <ion-footer class="ion-no-border">
        <div class="sticky-footer page">
          <ion-button expand="block" (click)="book()"><ion-icon slot="start" name="calendar" />Prendre rendez-vous</ion-button>
        </div>
      </ion-footer>
    }
  `,
  styles: `
    .floating { position: absolute; }
    .floating ion-toolbar { --background: transparent; }
    .round-btn { --background: rgba(255,255,255,.92); --border-radius: 50%; width: 40px; height: 40px; --color: var(--nini-ink);
      box-shadow: 0 2px 10px rgba(0,0,0,.12); border-radius: 50%; margin: 0 4px; }
    .fav { color: #e0245e; }
    .gallery { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; height: 300px; background: var(--nini-sand); }
    .gallery img { flex: 0 0 100%; height: 100%; object-fit: cover; scroll-snap-align: start; }
    @media (min-width: 720px) { .gallery img { flex-basis: 50%; } }
    .placeholder { flex: 1; display: grid; place-items: center; background: var(--nini-gradient); color: #fff; font-size: 72px; font-weight: 800; }
    .sheet { margin-top: -36px; position: relative; }
    .head { padding: 20px; }
    .category { color: var(--ion-color-primary); font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; gap: 5px; }
    h1 { font-size: 26px; margin: 6px 0 8px; display: flex; align-items: center; gap: 8px; }
    .verified { color: var(--ion-color-secondary); font-size: 22px; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; color: var(--nini-muted); font-size: 14px; margin-bottom: 10px; }
    .meta span { display: inline-flex; gap: 4px; align-items: center; }
    .actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
    .act { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; border-radius: 14px; background: var(--nini-sand);
      text-decoration: none; color: var(--nini-ink); font-weight: 700; font-size: 13px; }
    .act ion-icon { font-size: 22px; color: var(--ion-color-primary); }
    .act.wa { background: #25d366; color: #fff; }
    .act.wa ion-icon { color: #fff; }
    .list { padding: 4px 16px; }
    .service { display: flex; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--nini-line); }
    .service:last-child { border-bottom: 0; }
    .service strong { display: block; margin-bottom: 3px; }
    .service p { margin: 4px 0 0; }
    .right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .price { font-weight: 800; white-space: nowrap; }
    .about { line-height: 1.55; margin-top: 0; white-space: pre-line; }
    .hours .day { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; }
    .hours .today { font-weight: 800; color: var(--ion-color-primary); }
    .reviews { display: grid; gap: 10px; }
    .r-head { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--nini-sand); display: grid; place-items: center; font-weight: 800; }
    .date { margin-left: auto; }
    .review p { margin: 10px 0 0; line-height: 1.5; }
    .reply { background: var(--nini-sand); padding: 10px; border-radius: 10px; font-size: 14px; }
  `,
})
export class ProviderDetailPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly location = inject(LocationService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  readonly p = signal<ProviderDetail | null>(null);
  readonly favorite = signal(false);
  readonly weekdays = WEEKDAYS;
  readonly today = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getUTCDay()];

  readonly initialsOf = computed(() => initials(this.p()?.businessName ?? ''));
  readonly me = computed(() => {
    const pos = this.location.position();
    return pos ? { lat: pos.lat, lng: pos.lng } : null;
  });
  readonly distance = computed(() => {
    const p = this.p();
    const me = this.me();
    return p?.lat != null && me ? distanceKm(me, { lat: p.lat, lng: p.lng! }) : null;
  });
  readonly wa = computed(() => {
    const p = this.p();
    return p ? whatsappLink(p.whatsapp ?? p.phone, `Bonjour ${p.businessName}, je vous ai trouvé sur Ɲini. `) : '';
  });
  readonly directions = computed(() => {
    const p = this.p();
    return p ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : '';
  });

  async ngOnInit() {
    try {
      this.p.set(await this.api.get<ProviderDetail>(`/providers/${this.id()}`));
      if (this.auth.isLoggedIn()) {
        const ids = await this.api.get<string[]>('/me/favorites/ids');
        this.favorite.set(ids.includes(this.id()));
      }
    } catch (err) {
      await this.ui.error(err);
    }
  }

  book(service?: Service) {
    void this.router.navigate(['/prestataire', this.id(), 'reserver'], { queryParams: { service: service?.id } });
  }

  async toggleFavorite() {
    if (!this.auth.isLoggedIn()) {
      await this.router.navigate(['/connexion'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const on = !this.favorite();
    this.favorite.set(on);
    try {
      if (on) await this.api.put(`/me/favorites/${this.id()}`);
      else await this.api.delete(`/me/favorites/${this.id()}`);
      await this.ui.toast(on ? 'Ajouté à vos favoris' : 'Retiré de vos favoris');
    } catch (err) {
      this.favorite.set(!on);
      await this.ui.error(err);
    }
  }

  async share() {
    const p = this.p();
    if (!p) return;
    const url = `${location.origin}/prestataire/${p.id}`;
    const text = `${p.businessName} sur ${environment.appName}`;
    try {
      if ((await Share.canShare()).value) await Share.share({ title: p.businessName, text, url });
      else {
        await navigator.clipboard.writeText(url);
        await this.ui.toast('Lien copié');
      }
    } catch {
      /* partage annulé */
    }
  }
}
