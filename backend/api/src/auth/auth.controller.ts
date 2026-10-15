import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, type AuthUser } from '../common/roles.js';
import { AuthService } from './auth.service.js';
import { BecomeProviderDto, LoginDto, RegisterDto } from './auth.dto.js';

@ApiTags('Connexion')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Crée un compte client ou prestataire et renvoie le jeton de connexion. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Un client déjà inscrit crée sa page prestataire : il reçoit un nouveau jeton. */
  @ApiBearerAuth()
  @Post('become-provider')
  becomeProvider(
    @CurrentUser() user: AuthUser,
    @Body() dto: BecomeProviderDto,
  ) {
    return this.auth.becomeProvider(user.id, dto.provider, dto.quartier);
  }
}
