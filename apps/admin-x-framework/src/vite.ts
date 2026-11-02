import react from '@vitejs/plugin-react';
import { UserConfig, mergeConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default function adminXViteConfig({ overrides }: { overrides?: UserConfig } = {}) {
  const defaultConfig = defineConfig({
    logLevel: process.env.CI ? 'info' : 'warn',
    plugins: [svgr(), react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    test: {
      globals: true, // required for @testing-library/jest-dom extensions
      environment: 'jsdom',
      include: ['./test/unit/**/*'],
      testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 10000,
    },
  });

  return mergeConfig(defaultConfig, overrides || {});
}
