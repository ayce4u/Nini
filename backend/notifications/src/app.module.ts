import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import {
  ApplePushChannel,
  ConsoleChannel,
  OrangeSmsChannel,
  WhatsAppChannel,
} from './channels.js';
import {
  NOTIFICATIONS_QUEUE,
  NotificationsProcessor,
} from './notifications.processor.js';

@Controller('health')
class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  controllers: [HealthController],
  providers: [
    NotificationsProcessor,
    ApplePushChannel,
    WhatsAppChannel,
    OrangeSmsChannel,
    ConsoleChannel,
  ],
})
export class AppModule {}
