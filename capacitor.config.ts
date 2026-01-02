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
      // iOS: Widget data is shared via App Groups (configured in entitlements)
      // App Group ID: group.com.lovebirds.app
      // See ios/App/App/App.entitlements and ios/LovebirdsWidget/LovebirdsWidget.entitlements
    }
  }
};

export default config;
