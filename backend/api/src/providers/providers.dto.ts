import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { WeeklyHours } from '../common/time.js';

export class SearchProvidersDto {
  @ApiPropertyOptional({ description: 'Latitude du client (GPS)' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude du client (GPS)' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ description: 'Rayon de recherche en km' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quartier?: string;

  @ApiPropertyOptional({ description: 'Mot-clé : nom, description ou service' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ enum: ['distance', 'rating', 'price'] })
  @IsOptional()
  @IsIn(['distance', 'rating', 'price'])
  sort?: 'distance' | 'rating' | 'price';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  businessName?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  quartier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @IsOptional()
  @IsObject()
  weeklyHours?: WeeklyHours;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  slotStepMinutes?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class ServiceDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(0)
  priceFcfa: number;

  @IsOptional()
  @IsBoolean()
  priceFrom?: boolean;

  @IsInt()
  @Min(5)
  @Max(24 * 60)
  durationMinutes: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class TimeOffDto {
  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string;
}

export class CalendarImportDto {
  @IsString()
  @MaxLength(500)
  url: string;
}
