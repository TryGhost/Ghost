import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// `@tryghost/metafield-types/test/fixtures` is exported for tests only, as TypeScript with no build,
// so the tests point at its file. Every other package resolves as it is published, which keeps
// packages such as Shade on their builds: Shade's source imports through its own `@/` alias.
export default mergeConfig(
  viteConfig(),
  defineConfig({
    resolve: {
      alias: {
        '@tryghost/metafield-types/test/fixtures': fileURLToPath(
          new URL(
            './node_modules/@tryghost/metafield-types/test/fixtures/fields.ts',
            import.meta.url,
          ),
        ),
      },
    },
  }),
);
