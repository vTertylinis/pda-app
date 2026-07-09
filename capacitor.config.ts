import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'restaurant-app',
  webDir: 'www',
  server: {
    // Load the tablet app from pda-server instead of the files bundled in the
    // APK — deploying a new build to the server updates the tablet, no reinstall.
    url: 'http://192.168.68.116:4300/tablet/',
    cleartext: true,
    androidScheme: 'http'
  }
};

export default config;
