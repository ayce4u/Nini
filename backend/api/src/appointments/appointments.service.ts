import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  LessThan,
  MoreThanOrEqual,
  type FindOptionsWhere,
} from 'typeorm';
import { Appointment, type AppointmentStatus } from './appointment.entity.js';
import { AvailabilityService } from './availability.service.js';
import { ProviderService } from '../providers/provider-service.entity.js';
import { Provider } from '../providers/provider.entity.js';
import { Review } from '../reviews/review.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { StorageService } from '../files/storage.service.js';
import { normalizePhone } from '../common/phone.js';
import type { AuthUser } from '../common/roles.js';
import type { BookDto, ManualAppointmentDto } from './appointments.dto.js';

/** Changements de statut autorisés pour le prestataire. */
const PROVIDER_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: ['confirmed'], // correction d'une erreur de saisie
  no_show: ['completed'],
  declined: [],
  cancelled: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /** Le client réserve un créneau : le rendez-vous attend l'accord du prestataire. */
  async book(user: AuthUser, dto: BookDto) {
    if (user.providerId === dto.providerId)
      throw new BadRequestException('Tu ne peux pas réserver chez toi-même.');
    const service = await this.db.getRepository(ProviderService).findOneBy({
      id: dto.serviceId,
      providerId: dto.providerId,
      active: true,
    });
    if (!service) throw new NotFoundException('Ce service n’est plus proposé.');

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(
      startsAt.getTime() + service.durationMinutes * 60_000,
    );
    if (startsAt.getTime() < Date.now())
      throw new BadRequestException('Ce créneau est déjà passé.');
    if (
      !(await this.availability.withinOpeningHours(
        dto.providerId,
        startsAt,
        endsAt,
      ))
    ) {
      throw new BadRequestException(
        'Ce créneau est en dehors des horaires d’ouverture.',
      );
    }

    // Transaction + verrou sur le prestataire : deux clients ne peuvent pas prendre le même créneau.
    const saved = await this.db.transaction(async (tx) => {
      await tx.query('SELECT id FROM providers WHERE id = $1 FOR UPDATE', [
        dto.providerId,
      ]);
      if (!(await this.availability.isFree(dto.providerId, startsAt, endsAt))) {
        throw new ConflictException(
          'Ce créneau vient d’être pris. Choisis-en un autre.',
        );
      }
      const repo = tx.getRepository(Appointment);
      return repo.save(
        repo.create({
          providerId: dto.providerId,
          clientId: user.id,
          serviceId: service.id,
          serviceName: service.name,
          priceFcfa: service.priceFcfa,
          startsAt,
          endsAt,
          status: 'pending',
          source: 'app',
          note: dto.note ?? null,
          address: dto.address ?? null,
        }),
      );
    });
    await this.notifications.appointmentRequested(saved);
    return this.view(saved);
  }

  async mine(user: AuthUser, scope: 'upcoming' | 'past' = 'upcoming') {
    const now = new Date();
    const where: FindOptionsWhere<Appointment> =
      scope === 'upcoming'
        ? {
            clientId: user.id,
            endsAt: MoreThanOrEqual(now),
            status: In(['pending', 'confirmed']),
          }
        : { clientId: user.id, endsAt: LessThan(now) };
    const items = await this.db.getRepository(Appointment).find({
      where:
        scope === 'past'
          ? [
              where,
              {
                clientId: user.id,
                status: In(['cancelled', 'declined', 'completed', 'no_show']),
              },
            ]
          : where,
      relations: { provider: { user: true } },
      order: { startsAt: scope === 'upcoming' ? 'ASC' : 'DESC' },
      take: 100,
    });
    const reviewed = await this.reviewedIds(items.map((a) => a.id));
    return items.map((a) => this.view(a, reviewed.has(a.id)));
  }

  async one(user: AuthUser, id: string) {
    const appt = await this.db.getRepository(Appointment).findOne({
      where: { id },
      relations: { provider: { user: true }, client: true },
    });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable.');
    if (appt.clientId !== user.id && appt.providerId !== user.providerId)
      throw new ForbiddenException();
    const reviewed = await this.reviewedIds([appt.id]);
    return this.view(appt, reviewed.has(appt.id));
  }

  async cancelByClient(user: AuthUser, id: string) {
    const repo = this.db.getRepository(Appointment);
    const appt = await repo.findOneBy({ id, clientId: user.id });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable.');
    if (!['pending', 'confirmed'].includes(appt.status))
      throw new BadRequestException('Ce rendez-vous ne peut plus être annulé.');
    if (appt.startsAt.getTime() < Date.now())
      throw new BadRequestException('Ce rendez-vous a déjà commencé.');
    appt.status = 'cancelled';
    await repo.save(appt);
    await this.notifications.appointmentCancelled(appt, 'client');
    return this.one(user, id);
  }

  // ---------- Côté prestataire ----------

  async forProvider(
    providerId: string,
    from?: string,
    to?: string,
    status?: string,
  ) {
    const qb = this.db
      .getRepository(Appointment)
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.client', 'c')
      .leftJoinAndSelect('a.service', 's')
      .where('a.providerId = :providerId', { providerId })
      .orderBy('a.startsAt', 'ASC');
    if (from) qb.andWhere('a.endsAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('a.startsAt < :to', { to: new Date(to) });
    if (status)
      qb.andWhere('a.status IN (:...statuses)', {
        statuses: status.split(','),
      });
    const items = await qb.take(500).getMany();
    return items.map((a) => this.view(a));
  }

  async addManual(providerId: string, dto: ManualAppointmentDto) {
    let serviceName = dto.serviceName;
    let priceFcfa = dto.priceFcfa;
    let duration = dto.durationMinutes;
    if (dto.serviceId) {
      const service = await this.db
        .getRepository(ProviderService)
        .findOneBy({ id: dto.serviceId, providerId });
      if (!service) throw new NotFoundException('Service introuvable.');
      serviceName ??= service.name;
      priceFcfa ??= service.priceFcfa;
      duration ??= service.durationMinutes;
    }
    if (!serviceName || priceFcfa === undefined)
      throw new BadRequestException('Indique le service et le prix.');
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + (duration ?? 60) * 60_000);
    const status = dto.status ?? 'confirmed';
    if (
      status === 'confirmed' &&
      !(await this.availability.isFree(providerId, startsAt, endsAt))
    ) {
      throw new ConflictException(
        'Tu as déjà un rendez-vous ou une indisponibilité sur ce créneau.',
      );
    }
    const repo = this.db.getRepository(Appointment);
    const saved = await repo.save(
      repo.create({
        providerId,
        clientId: null,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone ? normalizePhone(dto.clientPhone) : null,
        serviceId: dto.serviceId ?? null,
        serviceName,
        priceFcfa,
        startsAt,
        endsAt,
        status,
        source: 'manual',
        note: dto.note ?? null,
      }),
    );
    return this.view(saved);
  }

  async setStatus(providerId: string, id: string, status: AppointmentStatus) {
    const repo = this.db.getRepository(Appointment);
    const appt = await repo.findOneBy({ id, providerId });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable.');
    if (!PROVIDER_TRANSITIONS[appt.status].includes(status)) {
      throw new BadRequestException(
        `Impossible de passer de « ${appt.status} » à « ${status} ».`,
      );
    }
    if (
      (status === 'completed' || status === 'no_show') &&
      appt.startsAt.getTime() > Date.now()
    ) {
      throw new BadRequestException('Ce rendez-vous n’a pas encore commencé.');
    }
    if (
      status === 'confirmed' &&
      !(await this.availability.isFree(
        providerId,
        appt.startsAt,
        appt.endsAt,
        appt.id,
      ))
    ) {
      throw new ConflictException('Ce créneau chevauche un autre rendez-vous.');
    }
    appt.status = status;
    await repo.save(appt);

    if (appt.source === 'app') {
      if (status === 'confirmed')
        await this.notifications.appointmentConfirmed(appt);
      if (status === 'declined')
        await this.notifications.appointmentDeclined(appt);
      if (status === 'cancelled')
        await this.notifications.appointmentCancelled(appt, 'provider');
      if (status === 'completed') await this.notifications.askForReview(appt);
    }
    return this.view(
      await repo.findOneOrFail({ where: { id }, relations: { client: true } }),
    );
  }

  private async reviewedIds(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const reviews = await this.db.getRepository(Review).find({
      where: { appointmentId: In(ids) },
      select: { appointmentId: true },
    });
    return new Set(reviews.map((r) => r.appointmentId));
  }

  view(a: Appointment, reviewed = false) {
    const provider = a.provider as Provider | undefined;
    return {
      id: a.id,
      status: a.status,
      source: a.source,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      serviceId: a.serviceId,
      serviceName: a.serviceName,
      priceFcfa: a.priceFcfa,
      note: a.note,
      address: a.address,
      reviewed,
      canReview: a.status === 'completed' && !!a.clientId && !reviewed,
      client: a.client
        ? {
            id: a.client.id,
            name: `${a.client.firstName} ${a.client.lastName}`,
            phone: a.client.phone,
          }
        : a.clientName
          ? { id: null, name: a.clientName, phone: a.clientPhone }
          : null,
      provider: provider
        ? {
            id: provider.id,
            businessName: provider.businessName,
            quartier: provider.quartier,
            phone: provider.user?.phone ?? null,
            whatsapp: provider.whatsapp,
            lat: provider.location?.coordinates[1] ?? null,
            lng: provider.location?.coordinates[0] ?? null,
          }
        : { id: a.providerId },
      createdAt: a.createdAt,
    };
  }
}
