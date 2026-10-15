import { Pipe, PipeTransform } from '@angular/core';

const TZ = 'Africa/Bamako';

export function fcfa(amount: number | null | undefined): string {
  if (amount == null) return '';
  return `${new Intl.NumberFormat('fr-FR').format(amount).replace(/ /g, ' ')} FCFA`;
}

export function shortFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (amount >= 1_000) return `${Math.round(amount / 1000)} k`;
  return String(amount);
}

export function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function distance(km: number | null | undefined): string {
  if (km == null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}

export function frDate(value: string | Date, style: 'long' | 'short' | 'time' | 'day' | 'full' = 'long'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    long: { weekday: 'long', day: 'numeric', month: 'long' },
    short: { day: 'numeric', month: 'short' },
    time: { hour: '2-digit', minute: '2-digit' },
    day: { weekday: 'short', day: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' },
  };
  const text = new Intl.DateTimeFormat('fr-FR', { ...options[style], timeZone: TZ }).format(date);
  // 15:30 → 15h30, comme on l'écrit au Mali.
  const withH = text.replace(/(\d{2}):(\d{2})/, '$1h$2');
  return style === 'time' ? withH : withH.charAt(0).toUpperCase() + withH.slice(1);
}

/** Jour au format AAAA-MM-JJ à l'heure de Bamako (UTC). */
export function isoDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** Lien WhatsApp avec un message déjà écrit. */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`;
}

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(v: number | null | undefined) {
    return fcfa(v);
  }
}

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(v: number) {
    return duration(v);
  }
}

@Pipe({ name: 'distance' })
export class DistancePipe implements PipeTransform {
  transform(v: number | null | undefined) {
    return distance(v);
  }
}

@Pipe({ name: 'frDate' })
export class FrDatePipe implements PipeTransform {
  transform(v: string | Date, style: 'long' | 'short' | 'time' | 'day' | 'full' = 'long') {
    return frDate(v, style);
  }
}

export const FORMAT_PIPES = [FcfaPipe, DurationPipe, DistancePipe, FrDatePipe];
