import type { CapacitorConfig } from '@capacitor/cli';

// Réglages de l'app iPhone (Capacitor transforme le site Angular en vraie app).
const config: CapacitorConfig = {
  appId: 'ml.nini.app',
  appName: 'Ɲini',
  webDir: 'www/browser',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#fbf7f0',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#e8762b',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
