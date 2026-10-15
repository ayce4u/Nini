import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Provider } from './provider.entity.js';
import { ProviderService } from './provider-service.entity.js';
import { ProviderPhoto } from './provider-photo.entity.js';
import { TimeOff } from './time-off.entity.js';
import { Category } from '../categories/category.entity.js';
import { Review } from '../reviews/review.entity.js';
import { User } from '../users/user.entity.js';
import { StorageService } from '../files/storage.service.js';
import { BAMAKO_CENTER, findQuartier } from '../common/quartiers.js';
import { normalizePhone } from '../common/phone.js';
import { WEEKDAYS, minutesOf, type WeeklyHours } from '../common/time.js';
import type {
  SearchProvidersDto,
  ServiceDto,
  TimeOffDto,
  UpdateProviderDto,
} from './providers.dto.js';

const MAX_PHOTOS = 12;

@Injectable()
export class ProvidersService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly storage: StorageService,
  ) {}

  /**
   * Recherche des prestataires, du plus proche au plus loin.
   * Sans position GPS, on part du centre du quartier choisi, ou du centre de Bamako.
   */
  async search(dto: SearchProvidersDto) {
    const quartier = findQuartier(dto.quartier);
    const origin =
      dto.lat !== undefined && dto.lng !== undefined
        ? { lat: dto.lat, lng: dto.lng }
        : quartier
          ? { lat: quartier.lat, lng: quartier.lng }
          : BAMAKO_CENTER;
    const limit = dto.limit ?? 20;
    const page = dto.page ?? 1;

    const qb = this.db
      .getRepository(Provider)
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .innerJoin('p.user', 'u')
      .addSelect('u.phone', 'phone')
      .addSelect(
        'ST_Distance(p.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)',
        'distance',
      )
      .addSelect(
        '(SELECT MIN(s."priceFcfa") FROM provider_services s WHERE s."providerId" = p.id AND s.active)',
        'minPrice',
      )
      .addSelect(
        '(SELECT ph.key FROM provider_photos ph WHERE ph."providerId" = p.id ORDER BY ph."isCover" DESC, ph."sortOrder" ASC LIMIT 1)',
        'coverKey',
      )
      .where('p.published = true')
      .andWhere('p.location IS NOT NULL')
      .setParameters({ lat: origin.lat, lng: origin.lng });

    if (dto.radiusKm) {
      qb.andWhere(
        'ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)',
        {
          radius: dto.radiusKm * 1000,
        },
      );
    }
    if (dto.category)
      qb.andWhere('p.categorySlug = :category', { category: dto.category });
    if (dto.quartier && dto.lat === undefined)
      qb.andWhere('p.quartier ILIKE :quartier', { quartier: dto.quartier });
    if (dto.q) {
      qb.andWhere(
        `(p.businessName ILIKE :q OR p.description ILIKE :q OR c.name ILIKE :q
          OR EXISTS (SELECT 1 FROM provider_services s WHERE s."providerId" = p.id AND s.active AND s.name ILIKE :q))`,
        { q: `%${dto.q.trim()}%` },
      );
    }

    switch (dto.sort) {
      case 'rating':
        qb.orderBy('p.ratingAvg', 'DESC').addOrderBy('p.ratingCount', 'DESC');
        break;
      case 'price':
        qb.orderBy('"minPrice"', 'ASC', 'NULLS LAST');
        break;
      default:
        qb.orderBy('distance', 'ASC');
    }

    const total = await qb.getCount();
    const { entities, raw } = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawAndEntities();

    const items = entities.map((p) => {
      const row = raw.find((r) => r.p_id === p.id);
      return {
        ...this.summary(p),
        phone: row?.phone ?? null,
        distanceKm:
          row?.distance != null
            ? Math.round(Number(row.distance) / 100) / 10
            : null,
        minPrice: row?.minPrice != null ? Number(row.minPrice) : null,
        coverUrl: this.storage.url(row?.coverKey),
      };
    });
    return { items, total, page, limit, origin };
  }

  /** Fiche complète d'un prestataire, visible par tous. */
  async detail(id: string) {
    const p = await this.db.getRepository(Provider).findOne({
      where: { id },
      relations: { user: true, services: true, photos: true },
    });
    if (!p) throw new NotFoundException('Prestataire introuvable.');
    const reviews = await this.db.getRepository(Review).find({
      where: { providerId: id },
      relations: { client: true },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    return {
      ...this.summary(p),
      phone: p.user.phone,
      description: p.description,
      landmark: p.landmark,
      weeklyHours: p.weeklyHours,
      memberSince: p.createdAt,
      services: p.services
        .filter((s) => s.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => this.serviceView(s)),
      photos: p.photos
        .sort(
          (a, b) =>
            Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder,
        )
        .map((ph) => ({
          id: ph.id,
          url: this.storage.url(ph.key),
          isCover: ph.isCover,
        })),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reply: r.reply,
        createdAt: r.createdAt,
        author: `${r.client.firstName} ${r.client.lastName.charAt(0)}.`,
      })),
    };
  }

  async reviews(id: string, page = 1) {
    const [items, total] = await this.db.getRepository(Review).findAndCount({
      where: { providerId: id },
      relations: { client: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * 20,
      take: 20,
    });
    return {
      total,
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reply: r.reply,
        createdAt: r.createdAt,
        author: `${r.client.firstName} ${r.client.lastName.charAt(0)}.`,
      })),
    };
  }

  // ---------- Espace prestataire ----------

  async mine(providerId: string) {
    const p = await this.db
      .getRepository(Provider)
      .createQueryBuilder('p')
      .addSelect(['p.calendarToken', 'p.calendarImportUrl'])
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.services', 's')
      .leftJoinAndSelect('p.photos', 'ph')
      .where('p.id = :providerId', { providerId })
      .getOne();
    if (!p) throw new NotFoundException('Profil prestataire introuvable.');
    return {
      ...(await this.detail(providerId)),
      published: p.published,
      slotStepMinutes: p.slotStepMinutes,
      referralCode: p.referralCode,
      calendarImportUrl: p.calendarImportUrl,
      calendarFeedPath: `/calendar/${p.id}.ics?token=${p.calendarToken}`,
      services: p.services
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => this.serviceView(s)),
    };
  }

  async update(providerId: string, dto: UpdateProviderDto) {
    const repo = this.db.getRepository(Provider);
    const p = await repo.findOneByOrFail({ id: providerId });
    if (
      dto.categorySlug &&
      !(await this.db
        .getRepository(Category)
        .existsBy({ slug: dto.categorySlug }))
    ) {
      throw new BadRequestException('Catégorie inconnue.');
    }
    if (dto.weeklyHours) this.checkHours(dto.weeklyHours);
    if ((dto.lat === undefined) !== (dto.lng === undefined)) {
      throw new BadRequestException(
        'Envoie la latitude et la longitude ensemble.',
      );
    }

    Object.assign(p, {
      businessName: dto.businessName?.trim() ?? p.businessName,
      categorySlug: dto.categorySlug ?? p.categorySlug,
      description: dto.description ?? p.description,
      quartier: dto.quartier ?? p.quartier,
      landmark: dto.landmark ?? p.landmark,
      mobile: dto.mobile ?? p.mobile,
      whatsapp:
        dto.whatsapp !== undefined
          ? dto.whatsapp
            ? normalizePhone(dto.whatsapp)
            : null
          : p.whatsapp,
      weeklyHours: dto.weeklyHours ?? p.weeklyHours,
      slotStepMinutes: dto.slotStepMinutes ?? p.slotStepMinutes,
      published: dto.published ?? p.published,
    });
    if (dto.lat !== undefined && dto.lng !== undefined) {
      p.location = { type: 'Point', coordinates: [dto.lng, dto.lat] };
    }
    // `category` est chargée automatiquement : on la retire pour que le nouveau slug soit bien enregistré.
    delete (p as Partial<Provider>).category;
    await repo.save(p);
    if (dto.quartier)
      await this.db
        .getRepository(User)
        .update({ id: p.userId }, { quartier: dto.quartier });
    return this.mine(providerId);
  }

  async addService(providerId: string, dto: ServiceDto) {
    const repo = this.db.getRepository(ProviderService);
    const count = await repo.countBy({ providerId });
    const saved = await repo.save(
      repo.create({ ...dto, providerId, sortOrder: count }),
    );
    return this.serviceView(saved);
  }

  async updateService(
    providerId: string,
    serviceId: string,
    dto: Partial<ServiceDto>,
  ) {
    const repo = this.db.getRepository(ProviderService);
    const service = await repo.findOneBy({ id: serviceId, providerId });
    if (!service) throw new NotFoundException('Service introuvable.');
    Object.assign(service, dto);
    return this.serviceView(await repo.save(service));
  }

  async removeService(providerId: string, serviceId: string) {
    // On désactive au lieu de supprimer : les anciens rendez-vous gardent leur historique.
    const res = await this.db
      .getRepository(ProviderService)
      .update({ id: serviceId, providerId }, { active: false });
    if (!res.affected) throw new NotFoundException('Service introuvable.');
    return { ok: true };
  }

  async addPhoto(providerId: string, file: Buffer, isCover: boolean) {
    const repo = this.db.getRepository(ProviderPhoto);
    const count = await repo.countBy({ providerId });
    if (count >= MAX_PHOTOS)
      throw new BadRequestException(`${MAX_PHOTOS} photos au maximum.`);
    const key = await this.storage.savePhoto(`providers/${providerId}`, file);
    if (isCover || count === 0)
      await repo.update({ providerId }, { isCover: false });
    const photo = await repo.save(
      repo.create({
        providerId,
        key,
        isCover: isCover || count === 0,
        sortOrder: count,
      }),
    );
    return { id: photo.id, url: this.storage.url(key), isCover: photo.isCover };
  }

  async setCover(providerId: string, photoId: string) {
    const repo = this.db.getRepository(ProviderPhoto);
    if (!(await repo.existsBy({ id: photoId, providerId })))
      throw new NotFoundException('Photo introuvable.');
    await repo.update({ providerId }, { isCover: false });
    await repo.update({ id: photoId }, { isCover: true });
    return { ok: true };
  }

  async removePhoto(providerId: string, photoId: string) {
    const repo = this.db.getRepository(ProviderPhoto);
    const photo = await repo.findOneBy({ id: photoId, providerId });
    if (!photo) throw new NotFoundException('Photo introuvable.');
    await repo.delete(photo.id);
    await this.storage.remove(photo.key);
    return { ok: true };
  }

  listTimeOff(providerId: string, from?: string, to?: string) {
    const qb = this.db
      .getRepository(TimeOff)
      .createQueryBuilder('t')
      .where('t.providerId = :providerId', { providerId })
      .orderBy('t.startsAt', 'ASC');
    if (from) qb.andWhere('t.endsAt >= :from', { from });
    if (to) qb.andWhere('t.startsAt <= :to', { to });
    return qb.getMany();
  }

  async addTimeOff(providerId: string, dto: TimeOffDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt)
      throw new BadRequestException('La fin doit être après le début.');
    const repo = this.db.getRepository(TimeOff);
    return repo.save(
      repo.create({
        providerId,
        startsAt,
        endsAt,
        reason: dto.reason ?? null,
        source: 'manual',
      }),
    );
  }

  async removeTimeOff(providerId: string, id: string) {
    const res = await this.db.getRepository(TimeOff).delete({ id, providerId });
    if (!res.affected)
      throw new NotFoundException('Indisponibilité introuvable.');
    return { ok: true };
  }

  assertOwner(user: { providerId?: string | null }): string {
    if (!user.providerId)
      throw new ForbiddenException('Réservé aux prestataires.');
    return user.providerId;
  }

  summary(p: Provider) {
    const [lng, lat] = p.location?.coordinates ?? [null, null];
    return {
      id: p.id,
      businessName: p.businessName,
      category: p.category
        ? {
            slug: p.category.slug,
            name: p.category.name,
            icon: p.category.icon,
          }
        : null,
      quartier: p.quartier,
      city: p.city,
      lat,
      lng,
      mobile: p.mobile,
      verified: p.verified,
      whatsapp: p.whatsapp,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
    };
  }

  serviceView(s: ProviderService) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      priceFcfa: s.priceFcfa,
      priceFrom: s.priceFrom,
      durationMinutes: s.durationMinutes,
      active: s.active,
    };
  }

  private checkHours(hours: WeeklyHours) {
    for (const day of WEEKDAYS) {
      const ranges = hours[day];
      if (!Array.isArray(ranges))
        throw new BadRequestException(`Horaires manquants pour « ${day} ».`);
      for (const r of ranges) {
        if (
          !/^\d{2}:\d{2}$/.test(r.start) ||
          !/^\d{2}:\d{2}$/.test(r.end) ||
          minutesOf(r.end) <= minutesOf(r.start)
        ) {
          throw new BadRequestException(`Horaires invalides pour « ${day} ».`);
        }
      }
    }
  }
}
