import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, Public, Roles, type AuthUser } from '../common/roles.js';
import { ProvidersService } from './providers.service.js';
import { ShareCardService } from './share-card.service.js';
import { AvailabilityService } from '../appointments/availability.service.js';
import {
  SearchProvidersDto,
  ServiceDto,
  TimeOffDto,
  UpdateProviderDto,
} from './providers.dto.js';

/** Pages publiques : recherche et fiches des prestataires. */
@ApiTags('Prestataires')
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly availability: AvailabilityService,
    private readonly shareCard: ShareCardService,
  ) {}

  @Public()
  @Get()
  search(@Query() dto: SearchProvidersDto) {
    return this.providers.search(dto);
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.providers.detail(id);
  }

  @Public()
  @Get(':id/reviews')
  reviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
  ) {
    return this.providers.reviews(id, Number(page) || 1);
  }

  /** Créneaux libres d'une journée : ?date=2026-10-20&duration=60 */
  @Public()
  @Get(':id/availability')
  slots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
    @Query('duration') duration?: string,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? ''))
      throw new BadRequestException('Date attendue au format AAAA-MM-JJ.');
    return this.availability.slots(id, date, Number(duration) || 60);
  }

  /** Image des disponibilités de la semaine, à partager sur les réseaux sociaux. */
  @Public()
  @Get(':id/share-card.png')
  async card(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const png = await this.shareCard.png(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.end(png);
  }
}

/** Espace prestataire : sa page, ses services, ses photos, ses indisponibilités. */
@ApiTags('Espace prestataire')
@ApiBearerAuth()
@Roles('provider')
@Controller('me/provider')
export class MyProviderController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly shareCard: ShareCardService,
  ) {}

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.providers.mine(this.providers.assertOwner(user));
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProviderDto) {
    return this.providers.update(this.providers.assertOwner(user), dto);
  }

  /** Lien et texte prêts à partager sur WhatsApp, Facebook, Instagram, TikTok. */
  @Get('share')
  async share(@CurrentUser() user: AuthUser) {
    const id = this.providers.assertOwner(user);
    const p = await this.providers.detail(id);
    const link = this.shareCard.link(id);
    return {
      link,
      imagePath: `/providers/${id}/share-card.png`,
      text: `${p.businessName} – ${p.category?.name ?? ''}${p.quartier ? ' à ' + p.quartier : ''}. Voici mes disponibilités de la semaine, réserve directement ici : ${link}`,
    };
  }

  @Post('services')
  addService(@CurrentUser() user: AuthUser, @Body() dto: ServiceDto) {
    return this.providers.addService(this.providers.assertOwner(user), dto);
  }

  @Patch('services/:id')
  updateService(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ServiceDto,
  ) {
    return this.providers.updateService(
      this.providers.assertOwner(user),
      id,
      dto,
    );
  }

  @Delete('services/:id')
  removeService(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.providers.removeService(this.providers.assertOwner(user), id);
  }

  @Post('photos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        cb(
          file.mimetype.startsWith('image/')
            ? null
            : new BadRequestException('Seules les images sont acceptées.'),
          file.mimetype.startsWith('image/'),
        ),
    }),
  )
  addPhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('cover') cover?: string,
  ) {
    if (!file) throw new BadRequestException('Aucune photo reçue.');
    return this.providers.addPhoto(
      this.providers.assertOwner(user),
      file.buffer,
      cover === 'true',
    );
  }

  @Patch('photos/:id/cover')
  setCover(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.providers.setCover(this.providers.assertOwner(user), id);
  }

  @Delete('photos/:id')
  removePhoto(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.providers.removePhoto(this.providers.assertOwner(user), id);
  }

  @Get('time-off')
  listTimeOff(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.providers.listTimeOff(
      this.providers.assertOwner(user),
      from,
      to,
    );
  }

  @Post('time-off')
  addTimeOff(@CurrentUser() user: AuthUser, @Body() dto: TimeOffDto) {
    return this.providers.addTimeOff(this.providers.assertOwner(user), dto);
  }

  @Delete('time-off/:id')
  removeTimeOff(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.providers.removeTimeOff(this.providers.assertOwner(user), id);
  }
}
