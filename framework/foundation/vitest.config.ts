import { defineConfig } from 'vitest/config';

// `source` resolves framework/support to its TypeScript, so tests need no build.
export default defineConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source', 'node'] } },
  test: { include: ['test/**/*.test.ts'] },
});
