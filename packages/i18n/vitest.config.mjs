import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['test/**/*.test.js'],
        // The registry entries use Vite's import.meta.glob, so they MUST be
        // Vitest-transformed (not externalized) or the glob stays an unresolved runtime
        // call. The CJS lib/i18n-core.js is covered by the CJS suite; the ESM path uses
        // the separate lib/i18n-core.mjs twin, so there's no shared-instance coverage
        // issue to work around.
        coverage: {
            provider: 'v8',
            include: [
                'index.js',
                'lib/**/*.js'
            ],
            // The ESM entries (lib/esm-factory.mjs, lib/registry/*.mjs) re-import the CJS
            // lib/i18n-core.js under ESM, which v8 would instrument as a phantom second
            // copy and mis-count its branches. The CJS test suite fully covers
            // i18n-core.js; the ESM entries' behaviour is asserted in the
            // 'ESM/browser entries' block. Keep them out of the coverage transform so the
            // 100% thresholds stay meaningful and honest.
            exclude: [
                'lib/esm-factory.mjs',
                'lib/registry/**'
            ],
            reporter: ['text', 'cobertura'],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100
            }
        }
    }
});
