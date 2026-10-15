import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, LessThan, MoreThan } from 'typeorm';
import { Provider } from '../providers/provider.entity.js';
import { TimeOff } from '../providers/time-off.entity.js';
import { Appointment, BLOCKING_STATUSES } from './appointment.entity.js';
import { addDays, atMinutes, minutesOf, weekdayOf } from '../common/time.js';

export interface Slot {
  startsAt: string;
  endsAt: string;
}

interface Busy {
  start: number;
  end: number;
}

/** Délai minimum entre maintenant et un rendez-vous réservé en ligne. */
const MIN_NOTICE_MS = 60 * 60_000;

@Injectable()
export class AvailabilityService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Créneaux libres d'un jour pour une durée donnée. */
  async slots(
    providerId: string,
    day: string,
    durationMinutes: number,
  ): Promise<Slot[]> {
    const provider = await this.db
      .getRepository(Provider)
      .findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Prestataire introuvable.');
    const busy = await this.busy(providerId, day, addDays(day, 1));
    return this.freeSlots(provider, day, durationMinutes, busy);
  }

  /** Nombre de créneaux libres par jour sur plusieurs jours (pour l'image de partage). */
  async week(providerId: string, from: string, days = 7, durationMinutes = 60) {
    const provider = await this.db
      .getRepository(Provider)
      .findOneBy({ id: providerId });
    if (!provider) throw new NotFoundException('Prestataire introuvable.');
    const busy = await this.busy(providerId, from, addDays(from, days));
    return Array.from({ length: days }, (_, i) => {
      const day = addDays(from, i);
      const slots = this.freeSlots(provider, day, durationMinutes, busy);
      return {
        day,
        open: provider.weeklyHours[weekdayOf(day)] ?? [],
        free: slots.length,
        first: slots[0]?.startsAt ?? null,
      };
    });
  }

  /** Vérifie qu'un créneau précis est encore libre (au moment de réserver). */
  async isFree(
    providerId: string,
    startsAt: Date,
    endsAt: Date,
    ignoreId?: string,
  ): Promise<boolean> {
    const overlapping = await this.db.getRepository(Appointment).count({
      where: {
        providerId,
        status: In(BLOCKING_STATUSES),
        startsAt: LessThan(endsAt),
        endsAt: MoreThan(startsAt),
      },
    });
    const off = await this.db.getRepository(TimeOff).count({
      where: {
        providerId,
        startsAt: LessThan(endsAt),
        endsAt: MoreThan(startsAt),
      },
    });
    if (ignoreId) {
      const self = await this.db.getRepository(Appointment).count({
        where: {
          id: ignoreId,
          startsAt: LessThan(endsAt),
          endsAt: MoreThan(startsAt),
          status: In(BLOCKING_STATUSES),
        },
      });
      return overlapping - self === 0 && off === 0;
    }
    return overlapping === 0 && off === 0;
  }

  /** Le créneau tombe-t-il dans les horaires d'ouverture ? */
  async withinOpeningHours(
    providerId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean> {
    const provider = await this.db
      .getRepository(Provider)
      .findOneBy({ id: providerId });
    if (!provider) return false;
    const day = startsAt.toISOString().slice(0, 10);
    const start = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();
    const end = start + (endsAt.getTime() - startsAt.getTime()) / 60_000;
    return (provider.weeklyHours[weekdayOf(day)] ?? []).some(
      (r) => start >= minutesOf(r.start) && end <= minutesOf(r.end),
    );
  }

  private async busy(
    providerId: string,
    fromDay: string,
    toDay: string,
  ): Promise<Busy[]> {
    const from = new Date(`${fromDay}T00:00:00Z`);
    const to = new Date(`${toDay}T00:00:00Z`);
    const [appointments, offs] = await Promise.all([
      this.db.getRepository(Appointment).find({
        where: {
          providerId,
          status: In(BLOCKING_STATUSES),
          startsAt: LessThan(to),
          endsAt: MoreThan(from),
        },
        select: { startsAt: true, endsAt: true },
      }),
      this.db.getRepository(TimeOff).find({
        where: { providerId, startsAt: LessThan(to), endsAt: MoreThan(from) },
        select: { startsAt: true, endsAt: true },
      }),
    ]);
    return [...appointments, ...offs].map((b) => ({
      start: b.startsAt.getTime(),
      end: b.endsAt.getTime(),
    }));
  }

  private freeSlots(
    provider: Provider,
    day: string,
    durationMinutes: number,
    busy: Busy[],
  ): Slot[] {
    const ranges = provider.weeklyHours[weekdayOf(day)] ?? [];
    const step = provider.slotStepMinutes || 30;
    const earliest = Date.now() + MIN_NOTICE_MS;
    const slots: Slot[] = [];
    for (const range of ranges) {
      for (
        let m = minutesOf(range.start);
        m + durationMinutes <= minutesOf(range.end);
        m += step
      ) {
        const start = atMinutes(day, m);
        const end = atMinutes(day, m + durationMinutes);
        if (start.getTime() < earliest) continue;
        const taken = busy.some(
          (b) => b.start < end.getTime() && b.end > start.getTime(),
        );
        if (!taken)
          slots.push({
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
          });
      }
    }
    return slots;
  }
}
