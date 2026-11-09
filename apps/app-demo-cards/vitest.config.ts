import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['source', ...defaultClientConditions] },
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  test: { include: ['test/**/*.test.{ts,tsx}'] },
});
