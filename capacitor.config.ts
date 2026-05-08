import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studyindex.app',
  appName: 'StudyIndex',
  webDir: 'dist',
  server: {
    androidScheme: 'https',   // Must be 'https' for Firebase OAuth redirects to work on Android
    hostname: 'studyindex.app',
    allowNavigation: ['*', 'accounts.google.com', '*.firebaseapp.com']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F5F5F0',
      showSpinner: false,
    }
  }
};

export default config;
