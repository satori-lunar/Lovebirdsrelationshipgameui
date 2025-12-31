import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovebirds.app',
  appName: 'Lovebirds',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Preferences plugin for widget data storage
    Preferences: {
      // iOS: Use App Groups for widget data sharing
      // group: 'group.com.lovebirds.app'
    }
  }
};

export default config;
