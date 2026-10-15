import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { databaseOptions } from './database/data-source.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { StatsModule } from './stats/stats.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { FilesModule } from './files/files.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: () => databaseOptions() }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get('REDIS_URL', 'redis://localhost:6379'));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
          prefix: 'nini',
        };
      },
    }),
    // Limite chaque adresse à 120 requêtes par minute (protège contre les abus).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    FilesModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    AppointmentsModule,
    ProvidersModule,
    ReviewsModule,
    FavoritesModule,
    StatsModule,
    CalendarModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
