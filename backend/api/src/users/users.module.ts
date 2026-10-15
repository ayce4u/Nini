import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';
import { User } from './user.entity.js';
import { Provider } from '../providers/provider.entity.js';
import { CurrentUser, type AuthUser } from '../common/roles.js';
import { publicUser } from '../auth/auth.service.js';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  quartier?: string;
}

export class PasswordDto {
  @IsString()
  current: string;

  @IsString()
  @MinLength(6)
  next: string;
}

export class PushTokenDto {
  @IsString()
  @MaxLength(255)
  token: string;
}

@ApiTags('Mon compte')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get()
  async me(@CurrentUser() auth: AuthUser) {
    const user = await this.db.getRepository(User).findOneBy({ id: auth.id });
    if (!user) throw new NotFoundException();
    const provider = await this.db
      .getRepository(Provider)
      .findOne({ where: { userId: user.id }, select: { id: true } });
    return publicUser(user, provider?.id);
  }

  @Patch()
  async update(@CurrentUser() auth: AuthUser, @Body() dto: UpdateMeDto) {
    await this.db.getRepository(User).update(
      { id: auth.id },
      {
        ...dto,
        email: dto.email === undefined ? undefined : dto.email.toLowerCase(),
      },
    );
    return this.me(auth);
  }

  @HttpCode(200)
  @Post('password')
  async password(@CurrentUser() auth: AuthUser, @Body() dto: PasswordDto) {
    const repo = this.db.getRepository(User);
    const user = await repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: auth.id })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.current, user.passwordHash))) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }
    await repo.update(
      { id: auth.id },
      { passwordHash: await bcrypt.hash(dto.next, 10) },
    );
    return { ok: true };
  }

  /** L'iPhone enregistre son jeton pour recevoir les notifications. */
  @HttpCode(200)
  @Post('push-token')
  async pushToken(@CurrentUser() auth: AuthUser, @Body() dto: PushTokenDto) {
    await this.db
      .getRepository(User)
      .update({ id: auth.id }, { pushToken: dto.token });
    return { ok: true };
  }
}

@Module({ controllers: [MeController] })
export class UsersModule {}
