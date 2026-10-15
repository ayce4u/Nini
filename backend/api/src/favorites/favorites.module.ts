import {
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Favorite } from './favorite.entity.js';
import { CurrentUser, type AuthUser } from '../common/roles.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { ProvidersService } from '../providers/providers.service.js';
import { StorageService } from '../files/storage.service.js';

@ApiTags('Favoris')
@ApiBearerAuth()
@Controller('me/favorites')
export class FavoritesController {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly providers: ProvidersService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const favorites = await this.db.getRepository(Favorite).find({
      where: { userId: user.id },
      relations: { provider: { photos: true } },
      order: { createdAt: 'DESC' },
    });
    return favorites.map((f) => {
      const cover =
        f.provider.photos.find((p) => p.isCover) ?? f.provider.photos[0];
      return {
        ...this.providers.summary(f.provider),
        coverUrl: this.storage.url(cover?.key),
      };
    });
  }

  @Get('ids')
  async ids(@CurrentUser() user: AuthUser) {
    const rows = await this.db
      .getRepository(Favorite)
      .find({ where: { userId: user.id }, select: { providerId: true } });
    return rows.map((r) => r.providerId);
  }

  @Put(':providerId')
  async add(
    @CurrentUser() user: AuthUser,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    await this.db
      .getRepository(Favorite)
      .upsert({ userId: user.id, providerId }, ['userId', 'providerId']);
    return { ok: true };
  }

  @Delete(':providerId')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('providerId', ParseUUIDPipe) providerId: string,
  ) {
    await this.db
      .getRepository(Favorite)
      .delete({ userId: user.id, providerId });
    return { ok: true };
  }
}

@Module({ imports: [ProvidersModule], controllers: [FavoritesController] })
export class FavoritesModule {}
