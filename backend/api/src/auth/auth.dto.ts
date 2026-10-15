import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '76 12 34 56' })
  @IsString()
  @Length(8, 20)
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class NewServiceDto {
  @IsString()
  @Length(2, 120)
  name: string;

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
  @IsString()
  @MaxLength(500)
  description?: string;
}

/** Informations demandées en plus quand on s'inscrit comme prestataire. */
export class ProviderSignupDto {
  @ApiProperty({ example: 'Salon Awa Coiffure' })
  @IsString()
  @Length(2, 120)
  businessName: string;

  @ApiProperty({ example: 'coiffure' })
  @IsString()
  categorySlug: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 12.6295 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: -8.0268 })
  @IsLongitude()
  lng: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @IsOptional()
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @ApiPropertyOptional({
    description: 'Code de parrainage reçu d’un autre prestataire',
  })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  referralCode?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewServiceDto)
  services?: NewServiceDto[];
}

export class RegisterDto {
  @ApiProperty({ enum: ['client', 'provider'] })
  @IsIn(['client', 'provider'])
  role: 'client' | 'provider';

  @ApiProperty({ example: 'Awa' })
  @IsString()
  @Length(1, 80)
  firstName: string;

  @ApiProperty({ example: 'Traoré' })
  @IsString()
  @Length(1, 80)
  lastName: string;

  @ApiProperty({ example: '76 12 34 56' })
  @IsString()
  @Length(8, 20)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ example: 'ACI 2000' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  quartier?: string;

  @ApiPropertyOptional({ type: ProviderSignupDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderSignupDto)
  provider?: ProviderSignupDto;
}

export class BecomeProviderDto {
  @ApiPropertyOptional({ example: 'ACI 2000' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  quartier?: string;

  @ApiProperty({ type: ProviderSignupDto })
  @ValidateNested()
  @Type(() => ProviderSignupDto)
  provider: ProviderSignupDto;
}
