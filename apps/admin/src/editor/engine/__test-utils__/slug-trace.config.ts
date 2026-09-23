// Throwaway oracle config: `SLUG_TRACE_FILE=<path> vitest run -c <this file>`.
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../../../vite.config';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

export default defineConfig((env) =>
  mergeConfig(base(env), {
    root,
    test: { setupFiles: ['./src/editor/engine/__test-utils__/slug-trace.setup.ts'] },
  }),
);
