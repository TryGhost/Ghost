import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({
  // Workspace packages export their TypeScript under the `source` condition, which the tests need
  // for entry points that have no build, such as `@tryghost/metafield-types/test/fixtures`.
  ssr: { resolve: { conditions: ['source', 'node'] } },
});
