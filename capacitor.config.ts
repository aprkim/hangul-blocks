import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aprkim.hangulblocks',
  appName: '한글 블록',
  webDir: 'dist',
  ios: {
    // The game fills the screen edge to edge; safe areas are handled in CSS.
    contentInset: 'never',
    backgroundColor: '#f5efe4',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#f5efe4',
      showSpinner: false,
    },
  },
}

export default config
