import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Response } from 'express';
import { DataSource, In, MoreThan } from 'typeorm';
import { timingSafeEqual } from 'node:crypto';
import { Provider } from '../providers/provider.entity.js';
import { TimeOff } from '../providers/time-off.entity.js';
import { Appointment } from '../appointments/appointment.entity.js';
import { CurrentUser, Public, Roles, type AuthUser } from '../common/roles.js';
import { CalendarImportDto } from '../providers/providers.dto.js';
import { buildIcs, parseIcs } from './ics.js';

/** Seuls ces agendas peuvent être importés (le serveur ne va pas chercher n'importe quelle adresse). */
const ALLOWED_HOSTS = [
  /^calendar\.google\.com$/,
  /^outlook\.(live|office365)\.com$/,
  /^p\d+-caldav\.icloud\.com$/,
];
const SYNC_EVERY_MS = 30 * 60_000;
const IMPORT_DAYS = 90;

@Injectable()
export class CalendarService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CalendarService.name);
  private timer?: NodeJS.Timeout;

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  onModuleInit() {
    // Resynchronise les agendas importés toutes les 30 minutes.
    this.timer = setInterval(() => void this.syncAll(), SYNC_EVERY_MS);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** Agenda du prestataire au format .ics, pour s'y abonner depuis Google Agenda ou l'iPhone. */
  async feed(providerId: string, token: string): Promise<string> {
    const provider = await this.db
      .getRepository(Provider)
      .createQueryBuilder('p')
      .addSelect('p.calendarToken')
      .where('p.id = :providerId', { providerId })
      .getOne();
    if (
      !provider ||
      !token ||
      token.length !== provider.calendarToken.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(provider.calendarToken))
    ) {
      throw new NotFoundException();
    }
    const since = new Date(Date.now() - 30 * 86_400_000);
    const appointments = await this.db.getRepository(Appointment).find({
      where: {
        providerId,
        startsAt: MoreThan(since),
        status: In(['pending', 'confirmed', 'completed']),
      },
      relations: { client: true },
      order: { startsAt: 'ASC' },
    });
    return buildIcs(
      `${provider.businessName} (Ɲini)`,
      appointments.map((a) => {
        const who = a.client
          ? `${a.client.firstName} ${a.client.lastName}`
          : (a.clientName ?? 'Client');
        const phone = a.client?.phone ?? a.clientPhone ?? '';
        return {
          uid: `${a.id}@nini`,
          start: a.startsAt,
          end: a.endsAt,
          summary: `${a.status === 'pending' ? '[À confirmer] ' : ''}${a.serviceName} – ${who}`,
          description: [
            phone && `Téléphone : ${phone}`,
            a.note && `Note : ${a.note}`,
          ]
            .filter(Boolean)
            .join('\n'),
        };
      }),
    );
  }

  async setImport(providerId: string, rawUrl: string) {
    const url = rawUrl.trim().replace(/^webcal:\/\//, 'https://');
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Adresse invalide.');
    }
    if (
      parsed.protocol !== 'https:' ||
      !ALLOWED_HOSTS.some((h) => h.test(parsed.hostname))
    ) {
      throw new BadRequestException(
        'Colle l’adresse secrète iCal de ton agenda Google, Outlook ou iCloud.',
      );
    }
    const count = await this.sync(providerId, parsed.toString());
    await this.db
      .getRepository(Provider)
      .update({ id: providerId }, { calendarImportUrl: parsed.toString() });
    return { ok: true, imported: count };
  }

  async removeImport(providerId: string) {
    await this.db
      .getRepository(Provider)
      .update({ id: providerId }, { calendarImportUrl: null });
    await this.db
      .getRepository(TimeOff)
      .delete({ providerId, source: 'calendar' });
    return { ok: true };
  }

  async syncNow(providerId: string) {
    const p = await this.db
      .getRepository(Provider)
      .createQueryBuilder('p')
      .addSelect('p.calendarImportUrl')
      .where('p.id = :providerId', { providerId })
      .getOne();
    if (!p?.calendarImportUrl)
      throw new BadRequestException('Aucun agenda importé.');
    return {
      ok: true,
      imported: await this.sync(providerId, p.calendarImportUrl),
    };
  }

  /** Remplace les indisponibilités « agenda » par les événements à venir de l'agenda importé. */
  private async sync(providerId: string, url: string): Promise<number> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    }).catch(() => null);
    if (!res?.ok)
      throw new BadRequestException(
        'Impossible de lire cet agenda. Vérifie l’adresse.',
      );
    const text = (await res.text()).slice(0, 5_000_000);
    if (!text.includes('BEGIN:VCALENDAR'))
      throw new BadRequestException(
        'Cette adresse ne contient pas un agenda iCal.',
      );

    const now = Date.now();
    const horizon = now + IMPORT_DAYS * 86_400_000;
    const events = parseIcs(text).filter(
      (e) => e.end.getTime() > now && e.start.getTime() < horizon,
    );

    await this.db.transaction(async (tx) => {
      const repo = tx.getRepository(TimeOff);
      await repo.delete({ providerId, source: 'calendar' });
      if (events.length) {
        await repo.save(
          events
            .slice(0, 1000)
            .map((e) =>
              repo.create({
                providerId,
                startsAt: e.start,
                endsAt: e.end,
                reason: e.summary.slice(0, 160),
                source: 'calendar',
              }),
            ),
        );
      }
    });
    return events.length;
  }

  private async syncAll() {
    const providers = await this.db
      .getRepository(Provider)
      .createQueryBuilder('p')
      .select(['p.id', 'p.calendarImportUrl'])
      .where('p.calendarImportUrl IS NOT NULL')
      .getMany();
    for (const p of providers) {
      await this.sync(p.id, p.calendarImportUrl!).catch((err) =>
        this.logger.warn(`Agenda de ${p.id} non synchronisé : ${err.message}`),
      );
    }
  }
}

@ApiTags('Agenda')
@Controller()
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Public()
  @Get('calendar/:file')
  async feed(
    @Param('file') file: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const providerId = file.replace(/\.ics$/, '');
    if (!/^[0-9a-f-]{36}$/.test(providerId)) throw new NotFoundException();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(await this.calendar.feed(providerId, token));
  }

  @ApiBearerAuth()
  @Roles('provider')
  @HttpCode(200)
  @Post('me/provider/calendar-import')
  setImport(@CurrentUser() user: AuthUser, @Body() dto: CalendarImportDto) {
    return this.calendar.setImport(this.owner(user), dto.url);
  }

  @ApiBearerAuth()
  @Roles('provider')
  @HttpCode(200)
  @Post('me/provider/calendar-import/sync')
  sync(@CurrentUser() user: AuthUser) {
    return this.calendar.syncNow(this.owner(user));
  }

  @ApiBearerAuth()
  @Roles('provider')
  @Delete('me/provider/calendar-import')
  remove(@CurrentUser() user: AuthUser) {
    return this.calendar.removeImport(this.owner(user));
  }

  private owner(user: AuthUser) {
    if (!user.providerId)
      throw new ForbiddenException('Réservé aux prestataires.');
    return user.providerId;
  }
}

@Module({ controllers: [CalendarController], providers: [CalendarService] })
export class CalendarModule {}
