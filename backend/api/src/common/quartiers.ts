/**
 * Quartiers de Bamako avec une position approximative de leur centre.
 * Ces coordonnées servent seulement de point de départ quand le téléphone
 * ne donne pas sa position GPS : la position réelle des prestataires
 * vient toujours du GPS de leur téléphone.
 */
export interface Quartier {
  name: string;
  commune: string;
  lat: number;
  lng: number;
}

export const DEFAULT_CITY = 'Bamako';
export const BAMAKO_CENTER = { lat: 12.6392, lng: -8.0029 };

export const QUARTIERS: Quartier[] = [
  { name: 'ACI 2000', commune: 'Commune IV', lat: 12.6295, lng: -8.0268 },
  { name: 'Hamdallaye', commune: 'Commune IV', lat: 12.6372, lng: -8.0226 },
  { name: 'Lafiabougou', commune: 'Commune IV', lat: 12.6382, lng: -8.0436 },
  { name: 'Djicoroni Para', commune: 'Commune IV', lat: 12.6315, lng: -8.0565 },
  { name: 'Sébénikoro', commune: 'Commune IV', lat: 12.6232, lng: -8.0795 },
  { name: 'Hippodrome', commune: 'Commune II', lat: 12.6543, lng: -7.9925 },
  { name: 'Médina Coura', commune: 'Commune II', lat: 12.6472, lng: -7.9925 },
  { name: 'Niaréla', commune: 'Commune II', lat: 12.6448, lng: -7.9805 },
  { name: 'Quinzambougou', commune: 'Commune II', lat: 12.6505, lng: -7.9835 },
  { name: 'Missira', commune: 'Commune II', lat: 12.6545, lng: -8.0035 },
  { name: 'Bamako Coura', commune: 'Commune III', lat: 12.6435, lng: -8.0065 },
  { name: 'Koulouba', commune: 'Commune III', lat: 12.6625, lng: -8.0045 },
  { name: 'Korofina', commune: 'Commune I', lat: 12.6555, lng: -7.9705 },
  { name: 'Banconi', commune: 'Commune I', lat: 12.6705, lng: -7.9765 },
  { name: 'Djélibougou', commune: 'Commune I', lat: 12.6555, lng: -7.9555 },
  { name: 'Sotuba', commune: 'Commune I', lat: 12.6585, lng: -7.9285 },
  { name: 'Badalabougou', commune: 'Commune V', lat: 12.6262, lng: -7.9975 },
  { name: 'Quartier Mali', commune: 'Commune V', lat: 12.6185, lng: -8.0085 },
  { name: 'Torokorobougou', commune: 'Commune V', lat: 12.6162, lng: -7.9895 },
  { name: 'Baco Djicoroni', commune: 'Commune V', lat: 12.5965, lng: -8.0125 },
  { name: 'Kalaban Coura', commune: 'Commune V', lat: 12.5885, lng: -7.9945 },
  { name: 'Daoudabougou', commune: 'Commune V', lat: 12.6085, lng: -7.9805 },
  { name: 'Magnambougou', commune: 'Commune VI', lat: 12.6115, lng: -7.9585 },
  { name: 'Faladié', commune: 'Commune VI', lat: 12.6005, lng: -7.9625 },
  { name: 'Sogoniko', commune: 'Commune VI', lat: 12.5985, lng: -7.9745 },
  { name: 'Niamakoro', commune: 'Commune VI', lat: 12.5845, lng: -7.9625 },
  { name: 'Sénou', commune: 'Commune VI', lat: 12.5395, lng: -7.9495 },
  { name: 'Yirimadio', commune: 'Commune VI', lat: 12.5895, lng: -7.9355 },
];

export function findQuartier(name?: string | null): Quartier | undefined {
  if (!name) return undefined;
  const wanted = name.trim().toLowerCase();
  return QUARTIERS.find((q) => q.name.toLowerCase() === wanted);
}
