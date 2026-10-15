/**
 * Met un numéro malien au format international : "76 12 34 56" → "+22376123456".
 * Les numéros maliens ont 8 chiffres après l'indicatif +223.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.length === 8) return `+223${digits}`;
  return `+${digits}`;
}

export function isValidPhone(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone);
}
