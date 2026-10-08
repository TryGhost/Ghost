import viteConfig from './vite.config.mjs';
import { playwright } from '@vitest/browser-playwright';

// The app's own build config with the unit-test block swapped for browser mode
export default async (env) => ({
  ...(await viteConfig(env)),
  test: {
    globals: true,
    include: ['test/acceptance/**/*.test.{ts,tsx}'],
    testTimeout: 15_000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }, { browser: 'webkit' }],
      viewport: { width: 1280, height: 800 },
    },
  },
});
