import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { User } from '../users/user.entity.js';
import { Provider } from '../providers/provider.entity.js';
import { ProviderService } from '../providers/provider-service.entity.js';
import { Category } from '../categories/category.entity.js';
import { isValidPhone, normalizePhone } from '../common/phone.js';
import { DEFAULT_CITY } from '../common/quartiers.js';
import type { LoginDto, ProviderSignupDto, RegisterDto } from './auth.dto.js';
import type { JwtPayload } from './auth.guard.js';

export interface AuthResult {
  token: string;
  user: ReturnType<typeof publicUser>;
}

export function publicUser(user: User, providerId?: string | null) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    quartier: user.quartier,
    city: user.city,
    providerId: providerId ?? null,
  };
}

/** Code court et lisible (sans 0/O ni 1/I pour éviter les confusions). */
export function randomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const phone = normalizePhone(dto.phone);
    if (!isValidPhone(phone))
      throw new BadRequestException('Numéro de téléphone invalide.');
    if (dto.role === 'provider' && !dto.provider) {
      throw new BadRequestException(
        'Les informations de ton activité sont obligatoires.',
      );
    }

    const exists = await this.db.getRepository(User).existsBy({ phone });
    if (exists)
      throw new ConflictException(
        'Un compte existe déjà avec ce numéro. Connecte-toi.',
      );

    return this.db.transaction(async (tx) => {
      const user = await tx.getRepository(User).save(
        tx.getRepository(User).create({
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone,
          email: dto.email?.trim().toLowerCase() || null,
          passwordHash: await bcrypt.hash(dto.password, 10),
          role: dto.role,
          quartier: dto.quartier ?? null,
          city: DEFAULT_CITY,
        }),
      );

      const providerId =
        dto.role === 'provider' && dto.provider
          ? await this.createProvider(tx, user, dto.provider, dto.quartier)
          : null;

      return {
        token: await this.sign(user, providerId),
        user: publicUser(user, providerId),
      };
    });
  }

  /** Un client existant ouvre sa page prestataire (même compte, même numéro). */
  async becomeProvider(
    userId: string,
    dto: ProviderSignupDto,
    quartier?: string,
  ): Promise<AuthResult> {
    return this.db.transaction(async (tx) => {
      const user = await tx.getRepository(User).findOneByOrFail({ id: userId });
      if (await tx.getRepository(Provider).existsBy({ userId })) {
        throw new ConflictException('Tu as déjà une page prestataire.');
      }
      user.role = 'provider';
      if (quartier) user.quartier = quartier;
      await tx.getRepository(User).save(user);
      const providerId = await this.createProvider(
        tx,
        user,
        dto,
        quartier ?? user.quartier ?? undefined,
      );
      return {
        token: await this.sign(user, providerId),
        user: publicUser(user, providerId),
      };
    });
  }

  private async createProvider(
    tx: EntityManager,
    user: User,
    p: ProviderSignupDto,
    quartier?: string,
  ): Promise<string> {
    const category = await tx
      .getRepository(Category)
      .findOneBy({ slug: p.categorySlug });
    if (!category) throw new BadRequestException('Catégorie inconnue.');

    let referredBy: string | null = null;
    if (p.referralCode) {
      const code = p.referralCode.trim().toUpperCase();
      const sponsor = await tx
        .getRepository(Provider)
        .existsBy({ referralCode: code });
      if (!sponsor)
        throw new BadRequestException('Ce code de parrainage n’existe pas.');
      referredBy = code;
    }

    const provider = await tx.getRepository(Provider).save(
      tx.getRepository(Provider).create({
        userId: user.id,
        businessName: p.businessName.trim(),
        categorySlug: category.slug,
        description: p.description?.trim() ?? '',
        quartier: quartier ?? null,
        city: DEFAULT_CITY,
        landmark: p.landmark ?? null,
        location: { type: 'Point', coordinates: [p.lng, p.lat] },
        mobile: p.mobile ?? false,
        whatsapp: p.whatsapp ? normalizePhone(p.whatsapp) : null,
        referralCode: randomCode(),
        referredBy,
        calendarToken: randomBytes(16).toString('hex'),
      }),
    );

    if (p.services?.length) {
      await tx
        .getRepository(ProviderService)
        .save(
          p.services.map((s, i) =>
            tx
              .getRepository(ProviderService)
              .create({ ...s, providerId: provider.id, sortOrder: i }),
          ),
        );
    }
    return provider.id;
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const phone = normalizePhone(dto.phone);
    const user = await this.db
      .getRepository(User)
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.phone = :phone', { phone })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Numéro ou mot de passe incorrect.');
    }
    const provider = await this.db
      .getRepository(Provider)
      .findOne({ where: { userId: user.id }, select: { id: true } });
    return {
      token: await this.sign(user, provider?.id),
      user: publicUser(user, provider?.id),
    };
  }

  sign(user: User, providerId?: string | null): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      pid: providerId ?? null,
    };
    return this.jwt.signAsync(payload);
  }
}
