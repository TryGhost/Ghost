import {defineConfig} from 'vitest/config';

/**
 * Shared Vitest config for internal Ghost packages.
 *
 * `options` is shallow-merged over the defaults: top-level keys land in `test`,
 * and a nested `coverage` object is merged over the default coverage block
 * (a provided `thresholds` replaces the default thresholds wholesale).
 *
 * @param {import('vitest/config').ViteUserConfig} [options]
 */
export function createVitestConfig(options = {}) {
    return defineConfig({
        ...options,

        test: {
            include: ['test/**/*.test.ts'],
            ...options?.test,
            coverage: {
                provider: 'v8',
                include: ['src/**/*.ts'],
                reporter: ['text', 'cobertura'],
                // Tune these per package. New server-side libs aim high.
                thresholds: {
                    lines: 100,
                    functions: 100,
                    branches: 80,
                    statements: 100
                },
                ...options?.test?.coverage
            }
        }
    });
}
