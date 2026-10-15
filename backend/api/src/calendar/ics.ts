/**
 * Petit lecteur / écrivain du format iCalendar (.ics), le format des agendas
 * Google, Apple et Outlook.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
}

/** Les lignes longues d'un .ics sont coupées et reprises avec un espace au début. */
function unfold(text: string): string[] {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

/**
 * 20261020T090000Z → date UTC. Sans « Z », on lit l'heure comme l'heure de
 * Bamako, qui est aussi l'heure UTC. 20261020 (journée entière) → minuit.
 */
export function parseIcsDate(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?Z?$/.exec(
    value.trim(),
  );
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') current = {};
    else if (line === 'END:VEVENT' && current) {
      const start = parseIcsDate(current.DTSTART ?? '');
      let end = parseIcsDate(current.DTEND ?? '');
      const allDay = /^\d{8}$/.test(current.DTSTART ?? '');
      if (start && !end)
        end = new Date(start.getTime() + (allDay ? 86_400_000 : 3_600_000));
      if (
        start &&
        end &&
        current.STATUS !== 'CANCELLED' &&
        current.TRANSP !== 'TRANSPARENT'
      ) {
        events.push({
          uid: current.UID ?? '',
          start,
          end,
          summary: current.SUMMARY ?? 'Occupé',
        });
      }
      current = null;
    } else if (current) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const name = line.slice(0, idx).split(';')[0].toUpperCase();
      current[name] = line.slice(idx + 1);
    }
  }
  return events;
}

const icsDate = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const icsText = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

export function buildIcs(
  name: string,
  events: Array<IcsEvent & { description?: string }>,
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nini//Planning//FR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${icsText(name)}`,
    'X-WR-TIMEZONE:Africa/Bamako',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${icsText(e.summary)}`,
      ...(e.description ? [`DESCRIPTION:${icsText(e.description)}`] : []),
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
