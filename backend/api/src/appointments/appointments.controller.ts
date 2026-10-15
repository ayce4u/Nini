import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, type AuthUser } from '../common/roles.js';
import { AppointmentsService } from './appointments.service.js';
import {
  BookDto,
  ManualAppointmentDto,
  StatusDto,
} from './appointments.dto.js';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('Rendez-vous')
@ApiBearerAuth()
@Controller()
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  /** Le client réserve un créneau. */
  @Post('appointments')
  book(@CurrentUser() user: AuthUser, @Body() dto: BookDto) {
    return this.appointments.book(user, dto);
  }

  @Get('appointments/:id')
  one(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.appointments.one(user, id);
  }

  /** Rendez-vous du client : ?scope=upcoming ou ?scope=past */
  @Get('me/appointments')
  mine(
    @CurrentUser() user: AuthUser,
    @Query('scope') scope?: 'upcoming' | 'past',
  ) {
    return this.appointments.mine(user, scope === 'past' ? 'past' : 'upcoming');
  }

  @Patch('me/appointments/:id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointments.cancelByClient(user, id);
  }

  /** Planning du prestataire : ?from=2026-10-01&to=2026-11-01&status=pending,confirmed */
  @Roles('provider')
  @Get('me/provider/appointments')
  planning(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.appointments.forProvider(this.owner(user), from, to, status);
  }

  @Roles('provider')
  @Post('me/provider/appointments')
  addManual(@CurrentUser() user: AuthUser, @Body() dto: ManualAppointmentDto) {
    return this.appointments.addManual(this.owner(user), dto);
  }

  @Roles('provider')
  @Patch('me/provider/appointments/:id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StatusDto,
  ) {
    return this.appointments.setStatus(this.owner(user), id, dto.status);
  }

  private owner(user: AuthUser): string {
    if (!user.providerId)
      throw new ForbiddenException('Réservé aux prestataires.');
    return user.providerId;
  }
}
