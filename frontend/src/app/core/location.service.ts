import { Injectable, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import type { Quartier } from './models';

export interface Position {
  lat: number;
  lng: number;
  /** "gps" = position réelle du téléphone, "quartier" = centre du quartier choisi. */
  source: 'gps' | 'quartier';
  label: string;
}

const KEY = 'nini.position';

/** Où se trouve l'utilisateur, pour lui montrer les prestataires les plus proches. */
@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly position = signal<Position | null>(null);

  async restore() {
    const saved = await Preferences.get({ key: KEY });
    if (saved.value) this.position.set(JSON.parse(saved.value));
  }

  /** Demande la position GPS du téléphone (une autorisation s'affiche la première fois). */
  async locate(): Promise<Position> {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 });
    const position: Position = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      source: 'gps',
      label: 'Ma position',
    };
    await this.set(position);
    return position;
  }

  async useQuartier(q: Quartier) {
    await this.set({ lat: q.lat, lng: q.lng, source: 'quartier', label: q.name });
  }

  private async set(position: Position) {
    this.position.set(position);
    await Preferences.set({ key: KEY, value: JSON.stringify(position) });
  }
}

/** Distance à vol d'oiseau entre deux points, en km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
