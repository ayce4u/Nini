import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import type { Category, Quartier } from './models';

/** Catégories et quartiers : chargés une fois, puis gardés en mémoire. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);
  readonly categories = signal<Category[]>([]);
  readonly quartiers = signal<Quartier[]>([]);
  private loading?: Promise<void>;

  load(force = false): Promise<void> {
    if (this.loading && !force) return this.loading;
    this.loading = Promise.all([this.api.get<Category[]>('/categories'), this.api.get<Quartier[]>('/quartiers')])
      .then(([categories, quartiers]) => {
        this.categories.set(categories);
        this.quartiers.set(quartiers);
      })
      .catch((err) => {
        this.loading = undefined;
        throw err;
      });
    return this.loading;
  }

  category(slug: string | null | undefined): Category | undefined {
    return this.categories().find((c) => c.slug === slug);
  }
}
