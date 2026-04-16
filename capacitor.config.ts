import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studyindex.app',
  appName: 'StudyIndex',
  webDir: 'dist',
  server: {
    androidScheme: 'app',
    hostname: 'studyindex.app',
    allowNavigation: ['*']
  }
};

export default config;
