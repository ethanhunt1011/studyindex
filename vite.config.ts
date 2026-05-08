import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Read local Firebase + Gemini config (only present in dev, never committed)
  let localCfg: Record<string, string> = {};
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      localCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    }
  } catch (e) { /* ignore */ }

  const geminiKey =
    env.VITE_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    '';

  const buildId = 'build_' + Date.now();

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      // Gemini (server-side key — injected so vite.config reads it; actual AI calls go through /api/*)
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
      // Firebase — read from local file in dev, from Render env vars in production
      'import.meta.env.VITE_FIREBASE_API_KEY':             JSON.stringify(env.VITE_FIREBASE_API_KEY             || localCfg.apiKey             || ''),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN':         JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN         || localCfg.authDomain         || ''),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID':          JSON.stringify(env.VITE_FIREBASE_PROJECT_ID          || localCfg.projectId          || ''),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET':      JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET      || localCfg.storageBucket      || ''),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || localCfg.messagingSenderId  || ''),
      'import.meta.env.VITE_FIREBASE_APP_ID':              JSON.stringify(env.VITE_FIREBASE_APP_ID              || localCfg.appId              || ''),
      'import.meta.env.VITE_FIREBASE_FIRESTORE_ID':        JSON.stringify(env.VITE_FIREBASE_FIRESTORE_ID        || localCfg.firestoreDatabaseId || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Only scan src/ and index.html — keeps Vite away from the android/
    // build artefacts that reference packages not in node_modules.
    optimizeDeps: {
      entries: ['index.html', 'src/**/*.{ts,tsx}'],
    },
    server: {
      hmr: true,
    },
  };
});
