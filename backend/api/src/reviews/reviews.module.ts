import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DataSource } from 'typeorm';
import { Review } from './review.entity.js';
import { Appointment } from '../appointments/appointment.entity.js';
import { CurrentUser, Roles, type AuthUser } from '../common/roles.js';

export class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReplyDto {
  @IsString()
  @MaxLength(1000)
  reply: string;
}

@Injectable()
export class ReviewsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Un avis par rendez-vous terminé, laissé par le client qui l'a réservé. */
  async create(user: AuthUser, appointmentId: string, dto: ReviewDto) {
    return this.db.transaction(async (tx) => {
      const appt = await tx
        .getRepository(Appointment)
        .findOneBy({ id: appointmentId });
      if (!appt) throw new NotFoundException('Rendez-vous introuvable.');
      if (appt.clientId !== user.id) throw new ForbiddenException();
      if (appt.status !== 'completed')
        throw new BadRequestException('Tu pourras noter après le rendez-vous.');
      if (await tx.getRepository(Review).existsBy({ appointmentId }))
        throw new ConflictException('Tu as déjà donné ton avis.');

      const review = await tx.getRepository(Review).save(
        tx.getRepository(Review).create({
          appointmentId,
          providerId: appt.providerId,
          clientId: user.id,
          rating: dto.rating,
          comment: dto.comment?.trim() ?? '',
        }),
      );
      // Recalcule la note moyenne affichée sur la fiche.
      await tx.query(
        `UPDATE providers SET "ratingAvg" = s.avg, "ratingCount" = s.count
         FROM (SELECT AVG(rating)::numeric(3,2) AS avg, COUNT(*) AS count FROM reviews WHERE "providerId" = $1) s
         WHERE id = $1`,
        [appt.providerId],
      );
      return review;
    });
  }

  async reply(providerId: string, reviewId: string, reply: string) {
    const repo = this.db.getRepository(Review);
    const review = await repo.findOneBy({ id: reviewId, providerId });
    if (!review) throw new NotFoundException('Avis introuvable.');
    review.reply = reply.trim() || null;
    return repo.save(review);
  }
}

@ApiTags('Avis')
@ApiBearerAuth()
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('appointments/:id/review')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDto,
  ) {
    return this.reviews.create(user, id, dto);
  }

  @Roles('provider')
  @Patch('me/provider/reviews/:id/reply')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyDto,
  ) {
    if (!user.providerId) throw new ForbiddenException();
    return this.reviews.reply(user.providerId, id, dto.reply);
  }
}

@Module({ controllers: [ReviewsController], providers: [ReviewsService] })
export class ReviewsModule {}
