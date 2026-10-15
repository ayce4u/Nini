import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { AvailabilityService } from '../appointments/availability.service.js';
import { ProvidersService } from './providers.service.js';
import { isoDay } from '../common/time.js';

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Fabrique l'image « Mes disponibilités de la semaine » que le prestataire
 * partage sur son statut WhatsApp, Facebook, Instagram ou TikTok.
 * Format 1080 × 1350 (portrait), lisible sur un téléphone.
 */
@Injectable()
export class ShareCardService {
  private readonly webUrl: string;
  private readonly appName: string;

  constructor(
    config: ConfigService,
    private readonly providers: ProvidersService,
    private readonly availability: AvailabilityService,
  ) {
    this.webUrl = config
      .get('PUBLIC_WEB_URL', 'http://localhost:8100')
      .replace(/\/$/, '');
    this.appName = config.get('APP_NAME', 'Ɲini');
  }

  link(providerId: string) {
    return `${this.webUrl}/prestataire/${providerId}`;
  }

  async png(providerId: string): Promise<Buffer> {
    const p = await this.providers.detail(providerId);
    const shortest = Math.min(...p.services.map((s) => s.durationMinutes), 60);
    const week = await this.availability.week(
      providerId,
      isoDay(new Date()),
      7,
      shortest,
    );

    const dayLabel = (day: string) =>
      new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
        .format(new Date(`${day}T00:00:00Z`))
        .replace(/^./, (c) => c.toUpperCase());

    const rows = week
      .map((d, i) => {
        const y = 520 + i * 92;
        const closed = d.open.length === 0;
        const hours = closed
          ? 'Fermé'
          : d.open
              .map(
                (r) =>
                  `${r.start.replace(':', 'h')}–${r.end.replace(':', 'h')}`,
              )
              .join(' · ');
        const badge = closed
          ? ''
          : d.free > 0
            ? `<rect x="760" y="${y - 40}" width="240" height="56" rx="28" fill="#1F9D6B"/><text x="880" y="${y - 3}" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${d.free} créneau${d.free > 1 ? 'x' : ''}</text>`
            : `<rect x="760" y="${y - 40}" width="240" height="56" rx="28" fill="#E8E2D6"/><text x="880" y="${y - 3}" font-size="28" font-weight="700" fill="#6B6257" text-anchor="middle">Plus de place</text>`;
        return `
          <text x="80" y="${y - 12}" font-size="34" font-weight="700" fill="#1D1A16">${escape(dayLabel(d.day))}</text>
          <text x="80" y="${y + 26}" font-size="26" fill="#6B6257">${escape(hours)}</text>
          ${badge}`;
      })
      .join('');

    const rating = p.ratingCount
      ? `★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount} avis)`
      : 'Nouveau sur ' + this.appName;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" font-family="DejaVu Sans, Arial, sans-serif">
        <rect width="1080" height="1350" fill="#FBF7F0"/>
        <rect width="1080" height="380" fill="#E8762B"/>
        <circle cx="980" cy="60" r="180" fill="#F2A65A" opacity="0.5"/>
        <text x="80" y="110" font-size="34" font-weight="700" fill="#FFE9D6" letter-spacing="4">${escape(this.appName.toUpperCase())}</text>
        <text x="80" y="200" font-size="64" font-weight="800" fill="#fff">${escape(p.businessName.slice(0, 26))}</text>
        <text x="80" y="260" font-size="34" fill="#FFE9D6">${escape(p.category?.name ?? '')}${p.quartier ? ' · ' + escape(p.quartier) : ''}</text>
        <text x="80" y="318" font-size="32" font-weight="700" fill="#fff">${escape(rating)}</text>
        <text x="80" y="450" font-size="40" font-weight="800" fill="#1D1A16">Mes disponibilités cette semaine</text>
        ${rows}
        <rect x="60" y="1190" width="960" height="110" rx="24" fill="#1D1A16"/>
        <text x="540" y="1238" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">Réserve en ligne sur ${escape(this.appName)}</text>
        <text x="540" y="1278" font-size="24" fill="#F2A65A" text-anchor="middle">${escape(this.link(providerId).replace(/^https?:\/\//, ''))}</text>
      </svg>`;
    return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  }
}
