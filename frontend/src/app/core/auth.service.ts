import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';
import type { AuthResult, Role, User } from './models';

const TOKEN_KEY = 'nini.token';
const USER_KEY = 'nini.user';
const ONBOARDED_KEY = 'nini.onboarded';

/** Garde l'utilisateur connecté (sur le téléphone ou dans le navigateur). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly onboarded = signal(false);
  readonly isLoggedIn = computed(() => !!this.token());
  readonly isProvider = computed(() => this.user()?.role === 'provider');

  /** Lu une seule fois au démarrage de l'app. */
  async restore(): Promise<void> {
    const [token, user, onboarded] = await Promise.all([
      Preferences.get({ key: TOKEN_KEY }),
      Preferences.get({ key: USER_KEY }),
      Preferences.get({ key: ONBOARDED_KEY }),
    ]);
    this.token.set(token.value);
    this.user.set(user.value ? JSON.parse(user.value) : null);
    this.onboarded.set(onboarded.value === 'true');
    if (token.value) void this.refresh();
  }

  async finishOnboarding() {
    this.onboarded.set(true);
    await Preferences.set({ key: ONBOARDED_KEY, value: 'true' });
  }

  async login(phone: string, password: string) {
    return this.save(await this.api.post<AuthResult>('/auth/login', { phone, password }));
  }

  async register(body: unknown) {
    return this.save(await this.api.post<AuthResult>('/auth/register', body));
  }

  /** Un client crée sa page prestataire avec le même compte. */
  async becomeProvider(body: unknown) {
    return this.save(await this.api.post<AuthResult>('/auth/become-provider', body));
  }

  async refresh() {
    try {
      const user = await this.api.get<User>('/me');
      this.user.set(user);
      await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
    } catch {
      /* hors ligne : on garde l'utilisateur en mémoire */
    }
  }

  async logout() {
    this.token.set(null);
    this.user.set(null);
    await Promise.all([Preferences.remove({ key: TOKEN_KEY }), Preferences.remove({ key: USER_KEY })]);
    await this.router.navigateByUrl('/bienvenue', { replaceUrl: true });
  }

  /** Page d'accueil selon le rôle. */
  homeUrl(): string {
    return this.isProvider() ? '/pro/tableau' : '/app/accueil';
  }

  private async save(result: AuthResult) {
    this.token.set(result.token);
    this.user.set(result.user);
    await Promise.all([
      Preferences.set({ key: TOKEN_KEY, value: result.token }),
      Preferences.set({ key: USER_KEY, value: JSON.stringify(result.user) }),
    ]);
    return result.user;
  }
}

/** Ajoute le jeton de connexion à chaque appel de l'API. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(
    catchError((err) => {
      if (err?.status === 401 && token) void auth.logout();
      return throwError(() => err);
    }),
  );
};

/** Pages réservées aux personnes connectées (et éventuellement à un rôle). */
export function requireRole(role?: Role): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) return router.createUrlTree(['/connexion'], { queryParams: { returnUrl: state.url } });
    if (role && auth.user()?.role !== role) return router.parseUrl(auth.homeUrl());
    return true;
  };
}

/** Première ouverture : les écrans de présentation ; ensuite, l'accueil du bon espace. */
export const startGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.onboarded()) return router.parseUrl('/presentation');
  if (auth.isLoggedIn()) return router.parseUrl(auth.homeUrl());
  return router.parseUrl('/app/accueil');
};
