import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  // So `#phone-lib` resolves to src rather than a stale build.
  ssr: { resolve: { conditions: ['source', 'node'] } },
});
