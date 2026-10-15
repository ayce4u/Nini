import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export type Role = 'client' | 'provider' | 'admin';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

/** Réserve une route à certains rôles (ex. @Roles('provider')). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Rend une route accessible sans être connecté. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthUser {
  id: string;
  role: Role;
  providerId?: string | null;
}

/** Récupère l'utilisateur connecté dans un contrôleur : @CurrentUser() user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
