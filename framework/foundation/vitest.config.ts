import { createVitestConfig } from '@internal/cfg-vitest';

// `source` resolves framework/support to its TypeScript, so tests need no build.
export default createVitestConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source', 'node'] } },
});
