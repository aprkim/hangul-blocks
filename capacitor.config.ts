import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lihallc.soriblocks',
  appName: '소리블록',
  webDir: 'dist',
  ios: {
    // The game fills the screen edge to edge; safe areas are handled in CSS.
    contentInset: 'never',
    backgroundColor: '#f6eedd',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#f6eedd',
      showSpinner: false,
    },
  },
}

export default config
