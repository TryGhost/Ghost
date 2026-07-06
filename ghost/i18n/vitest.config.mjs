import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['test/**/*.test.js'],
        // Load the ESM entry files as real Node ESM (not Vitest-transformed) so their
        // re-import of the CJS lib/i18n-core.js resolves to the SAME instrumented module
        // instance the CJS tests use — otherwise v8 counts a phantom second copy and
        // mis-reports i18n-core.js branch coverage.
        server: {
            deps: {
                external: [/lib\/esm-factory\.mjs$/, /lib\/registry\/.*\.mjs$/]
            }
        },
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
