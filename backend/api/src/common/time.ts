/**
 * Le Mali vit à l'heure GMT toute l'année (pas d'heure d'été) :
 * l'heure locale de Bamako est donc l'heure UTC. On s'appuie dessus pour
 * transformer « 2026-10-20 » + « 09:30 » en date précise.
 */
export const TIMEZONE = 'Africa/Bamako';

export const WEEKDAYS = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface TimeRange {
  start: string; // "08:00"
  end: string; // "18:00"
}

export type WeeklyHours = Record<Weekday, TimeRange[]>;

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: [{ start: '08:00', end: '18:00' }],
  tue: [{ start: '08:00', end: '18:00' }],
  wed: [{ start: '08:00', end: '18:00' }],
  thu: [{ start: '08:00', end: '18:00' }],
  fri: [
    { start: '08:00', end: '12:30' },
    { start: '14:30', end: '18:00' },
  ],
  sat: [{ start: '09:00', end: '16:00' }],
  sun: [],
};

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** "2026-10-20" + 570 minutes → Date 2026-10-20T09:30:00Z */
export function atMinutes(day: string, minutes: number): Date {
  const d = new Date(`${day}T00:00:00Z`);
  return new Date(d.getTime() + minutes * 60_000);
}

export function weekdayOf(day: string): Weekday {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

export function formatFr(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount).replace(/ /g, ' ')} FCFA`;
}
