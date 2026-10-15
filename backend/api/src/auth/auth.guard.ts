import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
  type AuthUser,
  type Role,
} from '../common/roles.js';

export interface JwtPayload {
  sub: string;
  role: Role;
  pid?: string | null;
}

/**
 * Vérifie le jeton de connexion sur chaque requête (sauf les routes @Public),
 * puis le rôle quand la route utilise @Roles(...).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request.headers.authorization);

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token);
        request.user = {
          id: payload.sub,
          role: payload.role,
          providerId: payload.pid,
        } satisfies AuthUser;
      } catch {
        if (!isPublic)
          throw new UnauthorizedException('Session expirée, reconnecte-toi.');
      }
    }

    if (isPublic) return true;
    if (!request.user) throw new UnauthorizedException('Connexion requise.');

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (roles?.length && !roles.includes(request.user.role)) {
      throw new ForbiddenException("Tu n'as pas accès à cette page.");
    }
    return true;
  }

  private extractToken(header?: string): string | undefined {
    const [type, token] = header?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
