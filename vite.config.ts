import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Read Firebase API key from local config if present
  let firebaseApiKey = '';
  try {
    const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      firebaseApiKey = firebaseConfig.apiKey || '';
    }
  } catch (e) {
    // ignore
  }

  const apiKey =
    env.VITE_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    firebaseApiKey ||
    '';

  const buildId = 'build_' + Date.now();

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
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
