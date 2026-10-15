import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service.js';
import { ShareCardService } from './share-card.service.js';
import {
  MyProviderController,
  ProvidersController,
} from './providers.controller.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';

@Module({
  imports: [AppointmentsModule],
  controllers: [ProvidersController, MyProviderController],
  providers: [ProvidersService, ShareCardService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
