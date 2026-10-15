import { describe, expect, it } from 'vitest';
import { addDays, distance, duration, fcfa, frDate, initials, whatsappLink } from './format';

describe('format', () => {
  it('écrit les prix en FCFA', () => {
    expect(fcfa(7500)).toBe('7 500 FCFA');
    expect(fcfa(null)).toBe('');
  });

  it('écrit les durées', () => {
    expect(duration(45)).toBe('45 min');
    expect(duration(60)).toBe('1 h');
    expect(duration(90)).toBe('1 h 30');
  });

  it('écrit les distances', () => {
    expect(distance(0.6)).toBe('600 m');
    expect(distance(2.84)).toBe('2,8 km');
  });

  it("écrit l'heure à la malienne (15h30)", () => {
    expect(frDate('2026-10-16T15:30:00Z', 'time')).toBe('15h30');
    expect(frDate('2026-10-16T15:30:00Z', 'full')).toContain('15h30');
  });

  it('compte les jours', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('prépare les initiales et le lien WhatsApp', () => {
    expect(initials('Salon Awa Coiffure')).toBe('SA');
    expect(whatsappLink('+223 76 12 34 56', 'Bonjour')).toBe('https://wa.me/22376123456?text=Bonjour');
  });
});
