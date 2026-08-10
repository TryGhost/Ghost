import {defineConfig} from 'vitest/config';

export interface KoenigVitestConfigOptions {
    /**
     * Setup files run before the suite. The `should`-based packages point this
     * at their `test/*utils/overrides.ts` (+ `assertions.ts`), which install the
     * `should` and `sinon` globals the mocha suite previously wired up.
     */
    setupFiles?: string[];
    /**
     * Coverage thresholds, preserving each package's old `c8 --check-coverage`
     * gate (e.g. `{lines: 90}` for the default gate, or all-100 for `--100`).
     * Omit for packages that never gated coverage.
     */
    thresholds?: {lines?: number; functions?: number; branches?: number; statements?: number};
}

/**
 * Shared vitest config for the koenig `kg-*` node libraries. These are plain
 * Node packages (no React/jsdom), tested from source with globals enabled so
 * the mocha-era `describe`/`it` blocks keep working unchanged.
 */
export function createKoenigVitestConfig({setupFiles = [], thresholds}: KoenigVitestConfigOptions = {}) {
    return defineConfig({
        test: {
            globals: true,
            environment: 'node',
            include: ['test/**/*.test.ts'],
            setupFiles,
            coverage: {
                provider: 'v8',
                reporter: ['text', 'cobertura'],
                include: ['src/**'],
                all: true,
                ...(thresholds && {thresholds})
            }
        }
    });
}
