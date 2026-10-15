import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { routes } from './app.routes';
import { AuthService, authInterceptor } from './core/auth.service';
import { LocationService } from './core/location.service';
import { registerIcons } from './core/icons';

registerLocaleData(localeFr);
registerIcons();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Même apparence (iOS) sur iPhone et sur le web, avec les retours en arrière par glissement.
    provideIonicAngular({ mode: 'ios', backButtonText: '' }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Avant d'afficher la première page : on relit la session et la position enregistrées.
    provideAppInitializer(async () => {
      await Promise.all([inject(AuthService).restore(), inject(LocationService).restore()]);
    }),
  ],
};
