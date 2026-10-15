import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import type { ProviderSummary } from '../core/models';
import { DistancePipe, FcfaPipe, initials, whatsappLink } from '../core/format';
import { StarsComponent } from './stars.component';

/** Carte d'un prestataire dans les listes : photo, nom, note, distance, prix, contact direct. */
@Component({
  selector: 'nini-provider-card',
  imports: [RouterLink, IonIcon, StarsComponent, DistancePipe, FcfaPipe],
  template: `
    @let p = provider();
    <article class="card-p" [routerLink]="['/prestataire', p.id]">
      <div class="cover" [style.background-image]="p.coverUrl ? 'url(' + p.coverUrl + ')' : null">
        @if (!p.coverUrl) {
          <span class="initials">{{ initialsOf() }}</span>
        }
        @if (p.distanceKm != null) {
          <span class="distance"><ion-icon name="navigate-outline" />{{ p.distanceKm | distance }}</span>
        }
      </div>
      <div class="body">
        <div class="top">
          <span class="category">
            @if (p.category) {
              <ion-icon [name]="p.category.icon" /> {{ p.category.name }}
            }
          </span>
          @if (p.verified) {
            <ion-icon class="verified" name="shield-checkmark" title="Prestataire vérifié" />
          }
        </div>
        <h3>{{ p.businessName }}</h3>
        <nini-stars [value]="p.ratingAvg" [count]="p.ratingCount" [compact]="true" />
        <div class="meta">
          <span><ion-icon name="location-outline" />{{ p.quartier || p.city }}</span>
          @if (p.mobile) {
            <span class="badge primary">Se déplace</span>
          }
        </div>
        <div class="bottom">
          @if (p.minPrice != null) {
            <span class="price">dès <strong>{{ p.minPrice | fcfa }}</strong></span>
          } @else {
            <span></span>
          }
          <span class="actions">
            @if (phone()) {
              <a class="round wa" [href]="wa()" target="_blank" rel="noopener" (click)="$event.stopPropagation()" aria-label="WhatsApp">
                <ion-icon name="logo-whatsapp" />
              </a>
              <a class="round call" [href]="'tel:' + phone()" (click)="$event.stopPropagation()" aria-label="Appeler">
                <ion-icon name="call" />
              </a>
            }
          </span>
        </div>
      </div>
    </article>
  `,
  styles: `
    .card-p {
      display: flex; gap: 14px; background: #fff; border-radius: var(--nini-radius); padding: 10px;
      box-shadow: var(--nini-shadow); cursor: pointer; transition: transform .15s ease, box-shadow .15s ease;
    }
    .card-p:hover { transform: translateY(-2px); box-shadow: var(--nini-shadow-lg); }
    .cover {
      position: relative; flex: 0 0 108px; height: 124px; border-radius: 14px; background: var(--nini-gradient);
      background-size: cover; background-position: center; display: grid; place-items: center;
    }
    .initials { color: #fff; font-size: 30px; font-weight: 800; opacity: .95; }
    .distance {
      position: absolute; left: 6px; bottom: 6px; background: rgba(29,26,22,.78); color: #fff; font-size: 11px;
      font-weight: 700; border-radius: 99px; padding: 3px 8px; display: inline-flex; gap: 3px; align-items: center;
    }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; padding: 2px 4px 2px 0; }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .category { font-size: 12px; font-weight: 700; color: var(--ion-color-primary); display: inline-flex; gap: 4px; align-items: center; }
    .verified { color: var(--ion-color-secondary); font-size: 18px; }
    h3 { margin: 0; font-size: 16px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--nini-muted); }
    .meta span:first-child { display: inline-flex; gap: 3px; align-items: center; }
    .bottom { margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
    .price { font-size: 13px; color: var(--nini-muted); }
    .price strong { color: var(--nini-ink); }
    .actions { display: flex; gap: 6px; }
    .round { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-size: 18px; color: #fff; }
    .wa { background: #25d366; }
    .call { background: var(--ion-color-primary); }
  `,
})
export class ProviderCardComponent {
  readonly provider = input.required<ProviderSummary>();
  readonly initialsOf = computed(() => initials(this.provider().businessName));
  readonly phone = computed(() => this.provider().whatsapp ?? this.provider().phone ?? null);
  readonly wa = computed(() =>
    whatsappLink(this.phone() ?? '', `Bonjour ${this.provider().businessName}, je vous ai trouvé sur Ɲini. `),
  );
}
