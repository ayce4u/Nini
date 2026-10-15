import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { CurrentUser, Roles, type AuthUser } from '../common/roles.js';
import { isoDay } from '../common/time.js';

export type Period = 'day' | 'week' | 'month' | 'year';

interface Range {
  from: Date;
  to: Date;
  /** Découpage du graphique : par heure, par jour ou par mois. */
  bucket: 'hour' | 'day' | 'month';
}

const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** Période qui contient la date donnée (heure de Bamako = UTC). */
export function rangeOf(period: Period, day: string): Range {
  const d = new Date(`${day}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (period) {
    case 'day':
      return {
        from: d,
        to: new Date(d.getTime() + 86_400_000),
        bucket: 'hour',
      };
    case 'week': {
      const monday = new Date(
        d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000,
      );
      return {
        from: monday,
        to: new Date(monday.getTime() + 7 * 86_400_000),
        bucket: 'day',
      };
    }
    case 'year':
      return {
        from: new Date(Date.UTC(y, 0, 1)),
        to: new Date(Date.UTC(y + 1, 0, 1)),
        bucket: 'month',
      };
    default:
      return {
        from: new Date(Date.UTC(y, m, 1)),
        to: new Date(Date.UTC(y, m + 1, 1)),
        bucket: 'day',
      };
  }
}

/** La même période juste avant, pour comparer (« +12 % par rapport au mois dernier »). */
export function previousRange(period: Period, range: Range): Range {
  const d = new Date(range.from.getTime() - 1);
  return rangeOf(period, isoDay(d));
}

@Injectable()
export class StatsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async stats(providerId: string, period: Period, day: string) {
    const range = rangeOf(period, day);
    const prev = previousRange(period, range);

    const [totals, prevTotals, series, topServices, topClients, newClients] =
      await Promise.all([
        this.totals(providerId, range),
        this.totals(providerId, prev),
        this.series(providerId, range),
        this.db.query(
          `SELECT "serviceName" AS name, COUNT(*)::int AS count, COALESCE(SUM("priceFcfa"),0)::int AS revenue
         FROM appointments WHERE "providerId" = $1 AND status = 'completed' AND "startsAt" >= $2 AND "startsAt" < $3
         GROUP BY "serviceName" ORDER BY revenue DESC LIMIT 5`,
          [providerId, range.from, range.to],
        ),
        this.db.query(
          `SELECT COALESCE(u."firstName" || ' ' || u."lastName", a."clientName", 'Client') AS name,
                COUNT(*)::int AS count, COALESCE(SUM(a."priceFcfa"),0)::int AS revenue
         FROM appointments a LEFT JOIN users u ON u.id = a."clientId"
         WHERE a."providerId" = $1 AND a.status = 'completed' AND a."startsAt" >= $2 AND a."startsAt" < $3
         GROUP BY 1 ORDER BY count DESC, revenue DESC LIMIT 5`,
          [providerId, range.from, range.to],
        ),
        this.db.query(
          `SELECT COUNT(*)::int AS n FROM (
           SELECT COALESCE(a."clientId"::text, a."clientPhone", a."clientName") AS who, MIN(a."startsAt") AS first
           FROM appointments a WHERE a."providerId" = $1 AND a.status = 'completed'
           GROUP BY 1) t
         WHERE t.first >= $2 AND t.first < $3`,
          [providerId, range.from, range.to],
        ),
      ]);

    const decided = totals.completed + totals.cancelled + totals.noShow;
    return {
      period,
      from: range.from,
      to: range.to,
      revenue: totals.revenue,
      previousRevenue: prevTotals.revenue,
      revenueChange: prevTotals.revenue
        ? Math.round(
            ((totals.revenue - prevTotals.revenue) / prevTotals.revenue) * 100,
          )
        : null,
      appointments: totals.all,
      completed: totals.completed,
      cancelled: totals.cancelled,
      noShow: totals.noShow,
      pending: totals.pending,
      cancellationRate: decided
        ? Math.round(((totals.cancelled + totals.noShow) / decided) * 100)
        : 0,
      averageBasket: totals.completed
        ? Math.round(totals.revenue / totals.completed)
        : 0,
      newClients: newClients[0]?.n ?? 0,
      series,
      topServices,
      topClients,
    };
  }

  /** Chiffres du tableau de bord : aujourd'hui, ce mois, cette année. */
  async dashboard(providerId: string) {
    const today = isoDay(new Date());
    const [day, month, year] = await Promise.all(
      (['day', 'month', 'year'] as const).map((p) =>
        this.totals(providerId, rangeOf(p, today)),
      ),
    );
    const [pending] = await this.db.query(
      `SELECT COUNT(*)::int AS n FROM appointments WHERE "providerId" = $1 AND status = 'pending' AND "startsAt" > now()`,
      [providerId],
    );
    const [provider] = await this.db.query(
      `SELECT "ratingAvg", "ratingCount" FROM providers WHERE id = $1`,
      [providerId],
    );
    return {
      today: day,
      month,
      year,
      pendingRequests: pending.n,
      ratingAvg: Number(provider?.ratingAvg ?? 0),
      ratingCount: provider?.ratingCount ?? 0,
    };
  }

  /** Export des rendez-vous pour Excel (CSV avec point-virgule, lisible par Excel en français). */
  async csv(providerId: string, from: Date, to: Date): Promise<string> {
    const rows = await this.db.query(
      `SELECT a."startsAt", a."serviceName", a."priceFcfa", a.status, a.source,
              COALESCE(u."firstName" || ' ' || u."lastName", a."clientName", '') AS client,
              COALESCE(u.phone, a."clientPhone", '') AS phone
       FROM appointments a LEFT JOIN users u ON u.id = a."clientId"
       WHERE a."providerId" = $1 AND a."startsAt" >= $2 AND a."startsAt" < $3
       ORDER BY a."startsAt"`,
      [providerId, from, to],
    );
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmé',
      declined: 'Refusé',
      cancelled: 'Annulé',
      completed: 'Terminé',
      no_show: 'Absent',
    };
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      [
        'Date',
        'Heure',
        'Client',
        'Téléphone',
        'Service',
        'Prix (FCFA)',
        'Statut',
        'Origine',
      ]
        .map(cell)
        .join(';'),
      ...rows.map((r: Record<string, any>) => {
        const d = new Date(r.startsAt);
        return [
          isoDay(d),
          d.toISOString().slice(11, 16),
          r.client,
          r.phone,
          r.serviceName,
          r.priceFcfa,
          labels[r.status] ?? r.status,
          r.source === 'manual' ? 'Ajouté à la main' : 'Réservé dans l’app',
        ]
          .map(cell)
          .join(';');
      }),
    ];
    return '﻿' + lines.join('\r\n');
  }

  private async totals(providerId: string, range: Range) {
    const [row] = await this.db.query(
      `SELECT COUNT(*)::int AS all,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
              COUNT(*) FILTER (WHERE status = 'no_show')::int AS "noShow",
              COUNT(*) FILTER (WHERE status IN ('pending','confirmed'))::int AS pending,
              COALESCE(SUM("priceFcfa") FILTER (WHERE status = 'completed'), 0)::int AS revenue
       FROM appointments
       WHERE "providerId" = $1 AND "startsAt" >= $2 AND "startsAt" < $3 AND status <> 'declined'`,
      [providerId, range.from, range.to],
    );
    return row as {
      all: number;
      completed: number;
      cancelled: number;
      noShow: number;
      pending: number;
      revenue: number;
    };
  }

  /** Une valeur par heure, jour ou mois, y compris les périodes vides (à 0). */
  private async series(providerId: string, range: Range) {
    const step =
      range.bucket === 'hour'
        ? '1 hour'
        : range.bucket === 'day'
          ? '1 day'
          : '1 month';
    const rows: Array<{ start: Date; revenue: number; count: number }> =
      await this.db.query(
        `SELECT g.start,
              COALESCE(SUM(a."priceFcfa") FILTER (WHERE a.status = 'completed'), 0)::int AS revenue,
              COUNT(a.id) FILTER (WHERE a.status IN ('completed','confirmed','pending'))::int AS count
       FROM generate_series($2::timestamptz, $3::timestamptz - interval '1 second', $4::interval) AS g(start)
       LEFT JOIN appointments a
         ON a."providerId" = $1 AND a."startsAt" >= g.start AND a."startsAt" < g.start + $4::interval
       GROUP BY g.start ORDER BY g.start`,
        [providerId, range.from, range.to, step],
      );
    return rows.map((r) => {
      const d = new Date(r.start);
      const label =
        range.bucket === 'hour'
          ? `${d.getUTCHours()}h`
          : range.bucket === 'month'
            ? MONTHS[d.getUTCMonth()]
            : range.to.getTime() - range.from.getTime() <= 7 * 86_400_000
              ? `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}`
              : String(d.getUTCDate());
      return { label, start: d, revenue: r.revenue, count: r.count };
    });
  }
}

@ApiTags('Statistiques')
@ApiBearerAuth()
@Roles('provider')
@Controller('me/provider')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.stats.dashboard(this.owner(user));
  }

  /** ?period=day|week|month|year&date=2026-10-15 */
  @Get('stats')
  get(
    @CurrentUser() user: AuthUser,
    @Query('period') period?: Period,
    @Query('date') date?: string,
  ) {
    const p: Period = ['day', 'week', 'month', 'year'].includes(period ?? '')
      ? (period as Period)
      : 'month';
    const d =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : isoDay(new Date());
    return this.stats.stats(this.owner(user), p, d);
  }

  @Get('stats/export.csv')
  async export(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const start = from
      ? new Date(from)
      : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const end = to ? new Date(to) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      throw new BadRequestException('Dates invalides.');
    const csv = await this.stats.csv(
      this.owner(user),
      start,
      new Date(end.getTime() + 86_400_000),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rendez-vous-${isoDay(start)}-${isoDay(end)}.csv"`,
    );
    res.send(csv);
  }

  private owner(user: AuthUser) {
    if (!user.providerId)
      throw new ForbiddenException('Réservé aux prestataires.');
    return user.providerId;
  }
}

@Module({ controllers: [StatsController], providers: [StatsService] })
export class StatsModule {}
