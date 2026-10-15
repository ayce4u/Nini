import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { AvailabilityService } from './availability.service.js';
import { AppointmentsController } from './appointments.controller.js';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AvailabilityService],
  exports: [AppointmentsService, AvailabilityService],
})
export class AppointmentsModule {}
