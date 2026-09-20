// Isolated, local-only preview while the real site's configured origin is unavailable.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sharedDefine, sharedResolve } from './vite.shared';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: sharedDefine,
  resolve: sharedResolve,
  server: { host: '127.0.0.1', port: 5188, strictPort: true },
});
