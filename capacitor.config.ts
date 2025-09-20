import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memora.app',
  appName: 'Memora',
  webDir: 'dist', // The folder where 'npm run build' outputs your static files
  server: {
    androidScheme: 'https'
  }
};

export default config;
