import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Reverse-domain id. Must be UNIQUE and is PERMANENT once published — pick
  // carefully. Change if you own a domain (e.g. 'tech.stimuler.stylesync').
  appId: 'com.stylesync.app',
  appName: 'StyleSync',

  // Capacitor requires a webDir to exist; with server.url below it isn't
  // really used, so we point it at the existing public/ folder.
  webDir: 'public',

  server: {
    // The native shell loads your live app. Swap for a custom domain later.
    // To bundle offline static files instead, remove `url` (needs a static export).
    url: 'https://stylesync-murex.vercel.app',
    androidScheme: 'https',
  },
}

export default config
