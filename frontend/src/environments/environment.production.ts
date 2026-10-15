/**
 * Réglages en production.
 * Le site web parle à l'API par /api (même domaine, via nginx).
 * L'app iPhone a besoin de l'adresse complète : remplace-la par ton domaine.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
  nativeApiUrl: 'https://nini.ml/api',
  appName: 'Ɲini',
};
