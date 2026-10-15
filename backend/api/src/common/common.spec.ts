import { normalizePhone, isValidPhone } from './phone.js';
import { addDays, atMinutes, weekdayOf, formatFcfa } from './time.js';
import { rangeOf, previousRange } from '../stats/stats.module.js';
import { parseIcs, buildIcs, parseIcsDate } from '../calendar/ics.js';

describe('numéros de téléphone', () => {
  it('ajoute +223 aux numéros maliens à 8 chiffres', () => {
    expect(normalizePhone('76 12 34 56')).toBe('+22376123456');
    expect(normalizePhone('0022366001122')).toBe('+22366001122');
    expect(isValidPhone('+22376123456')).toBe(true);
    expect(isValidPhone('+12')).toBe(false);
  });
});

describe('dates', () => {
  it('calcule jours et heures à l’heure de Bamako (UTC)', () => {
    expect(atMinutes('2026-10-20', 570).toISOString()).toBe('2026-10-20T09:30:00.000Z');
    expect(weekdayOf('2026-10-18')).toBe('sun');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(formatFcfa(15000)).toBe('15 000 FCFA');
  });

  it('découpe les périodes des statistiques', () => {
    const month = rangeOf('month', '2026-10-15');
    expect(month.from.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(month.to.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(previousRange('month', month).from.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    const week = rangeOf('week', '2026-10-15'); // un jeudi
    expect(week.from.toISOString()).toBe('2026-10-12T00:00:00.000Z'); // lundi
    expect(rangeOf('year', '2026-10-15').bucket).toBe('month');
  });
});

describe('agenda iCal', () => {
  it('lit les événements, y compris les journées entières', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:1',
      'DTSTART:20261020T090000Z',
      'DTEND:20261020T100000Z',
      'SUMMARY:Rendez-vous ',
      ' perso',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:2',
      'DTSTART;VALUE=DATE:20261021',
      'SUMMARY:Congé',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:3',
      'DTSTART:20261022T090000Z',
      'STATUS:CANCELLED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const events = parseIcs(ics);
    expect(events).toHaveLength(2);
    expect(events[0].summary).toBe('Rendez-vous perso');
    expect(events[1].end.toISOString()).toBe('2026-10-22T00:00:00.000Z');
  });

  it('écrit un agenda relisible', () => {
    const start = parseIcsDate('20261020T090000Z')!;
    const ics = buildIcs('Test', [{ uid: 'a', start, end: new Date(start.getTime() + 3600_000), summary: 'Tresses; client' }]);
    expect(parseIcs(ics)[0].start.toISOString()).toBe('2026-10-20T09:00:00.000Z');
  });
});
