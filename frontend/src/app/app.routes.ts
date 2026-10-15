import { Routes } from '@angular/router';
import { requireRole, startGuard } from './core/auth.service';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [startGuard], children: [] },

  // Premiers pas
  { path: 'presentation', loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage) },
  { path: 'bienvenue', loadComponent: () => import('./pages/auth/welcome.page').then((m) => m.WelcomePage) },
  { path: 'connexion', loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage) },
  { path: 'inscription/client', loadComponent: () => import('./pages/auth/register-client.page').then((m) => m.RegisterClientPage) },
  {
    path: 'inscription/prestataire',
    loadComponent: () => import('./pages/auth/register-provider.page').then((m) => m.RegisterProviderPage),
  },

  // Espace client (la recherche est ouverte à tous, sans compte)
  {
    path: 'app',
    loadComponent: () => import('./pages/client/client-tabs.page').then((m) => m.ClientTabsPage),
    children: [
      { path: 'accueil', loadComponent: () => import('./pages/client/home.page').then((m) => m.HomePage) },
      { path: 'recherche', loadComponent: () => import('./pages/client/search.page').then((m) => m.SearchPage) },
      {
        path: 'rendez-vous',
        canActivate: [requireRole()],
        loadComponent: () => import('./pages/client/my-appointments.page').then((m) => m.MyAppointmentsPage),
      },
      {
        path: 'favoris',
        canActivate: [requireRole()],
        loadComponent: () => import('./pages/client/favorites.page').then((m) => m.FavoritesPage),
      },
      { path: 'compte', loadComponent: () => import('./pages/shared/account.page').then((m) => m.AccountPage) },
      { path: '', pathMatch: 'full', redirectTo: 'accueil' },
    ],
  },
  { path: 'prestataire/:id', loadComponent: () => import('./pages/client/provider-detail.page').then((m) => m.ProviderDetailPage) },
  {
    path: 'prestataire/:id/reserver',
    canActivate: [requireRole()],
    loadComponent: () => import('./pages/client/booking.page').then((m) => m.BookingPage),
  },
  {
    path: 'rendez-vous/:id',
    canActivate: [requireRole()],
    loadComponent: () => import('./pages/client/appointment-detail.page').then((m) => m.AppointmentDetailPage),
  },
  {
    path: 'rendez-vous/:id/avis',
    canActivate: [requireRole()],
    loadComponent: () => import('./pages/client/review.page').then((m) => m.ReviewPage),
  },

  // Espace prestataire
  {
    path: 'pro',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/pro-tabs.page').then((m) => m.ProTabsPage),
    children: [
      { path: 'tableau', loadComponent: () => import('./pages/pro/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'planning', loadComponent: () => import('./pages/pro/planning.page').then((m) => m.PlanningPage) },
      { path: 'stats', loadComponent: () => import('./pages/pro/stats.page').then((m) => m.StatsPage) },
      { path: 'ma-page', loadComponent: () => import('./pages/pro/my-page.page').then((m) => m.MyPagePage) },
      { path: 'compte', loadComponent: () => import('./pages/shared/account.page').then((m) => m.AccountPage) },
      { path: '', pathMatch: 'full', redirectTo: 'tableau' },
    ],
  },
  {
    path: 'pro/profil/infos',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/edit-info.page').then((m) => m.EditInfoPage),
  },
  {
    path: 'pro/profil/services',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/edit-services.page').then((m) => m.EditServicesPage),
  },
  {
    path: 'pro/profil/photos',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/edit-photos.page').then((m) => m.EditPhotosPage),
  },
  {
    path: 'pro/profil/horaires',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/edit-hours.page').then((m) => m.EditHoursPage),
  },
  {
    path: 'pro/profil/partage',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/share.page').then((m) => m.SharePage),
  },
  {
    path: 'pro/profil/agenda',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/calendar-sync.page').then((m) => m.CalendarSyncPage),
  },
  {
    path: 'pro/avis',
    canActivate: [requireRole('provider')],
    loadComponent: () => import('./pages/pro/reviews.page').then((m) => m.ProReviewsPage),
  },

  { path: '**', redirectTo: '' },
];
