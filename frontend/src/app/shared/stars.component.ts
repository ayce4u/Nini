import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/** Note en étoiles : ★★★★☆ 4,2 (18) */
@Component({
  selector: 'nini-stars',
  imports: [IonIcon],
  template: `
    <span class="stars" [class.compact]="compact()">
      @for (s of icons(); track $index) {
        <ion-icon [name]="s" />
      }
      @if (count() !== null) {
        <span class="value">
          @if (count()! > 0) {
            {{ value().toFixed(1).replace('.', ',') }} <span class="count">({{ count() }})</span>
          } @else {
            <span class="count">Nouveau</span>
          }
        </span>
      }
    </span>
  `,
  styles: `
    .stars { display: inline-flex; align-items: center; gap: 1px; color: #f2a01c; font-size: 14px; }
    .compact { font-size: 12px; }
    .value { color: var(--nini-ink); font-weight: 700; margin-left: 5px; font-size: 13px; }
    .count { color: var(--nini-muted); font-weight: 500; }
  `,
})
export class StarsComponent {
  readonly value = input(0);
  readonly count = input<number | null>(null);
  readonly compact = input(false);

  readonly icons = computed(() =>
    [1, 2, 3, 4, 5].map((i) => (this.value() >= i ? 'star' : this.value() >= i - 0.5 ? 'star-half' : 'star-outline')),
  );
}
