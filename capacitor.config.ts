import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lihallc.soriblocks',
  appName: '소리블록',
  webDir: 'dist-app',
  ios: {
    // The game fills the screen edge to edge; safe areas are handled in CSS.
    contentInset: 'never',
    backgroundColor: '#f6eedd',
  },
  plugins: {
    SplashScreen: {
      // The app takes the splash down itself once its first screen is drawn (native.ts), so
      // there is never a blank moment in between. This duration is only the longest it may stay
      // if that call never comes.
      launchShowDuration: 4000,
      backgroundColor: '#f6eedd',
      showSpinner: false,
    },
  },
}

export default config
