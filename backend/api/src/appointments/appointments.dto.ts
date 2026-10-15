import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { AppointmentStatus } from './appointment.entity.js';

export class BookDto {
  @IsUUID()
  providerId: string;

  @IsUUID()
  serviceId: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

/** Rendez-vous ajouté par le prestataire lui-même (client venu sur place ou par téléphone). */
export class ManualAppointmentDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  serviceName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceFcfa?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(24 * 60)
  durationMinutes?: number;

  @IsString()
  @Length(1, 120)
  clientName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  clientPhone?: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsIn(['confirmed', 'completed'])
  status?: 'confirmed' | 'completed';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class StatusDto {
  @IsIn(['confirmed', 'declined', 'cancelled', 'completed', 'no_show'])
  status: Exclude<AppointmentStatus, 'pending'>;
}
