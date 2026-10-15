import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NotificationsService,
} from './notifications.service.js';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
