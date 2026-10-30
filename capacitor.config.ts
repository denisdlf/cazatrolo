import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cl.cazatrolo.app',
  appName: 'CAZATROLO',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#16051f',
      showSpinner: false,
    },
  },
}

export default config
