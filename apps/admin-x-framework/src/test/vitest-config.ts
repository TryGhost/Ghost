import path from 'path';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export interface VitestConfigOptions {
    /** Custom setup files (defaults to ['./test/setup.ts']) */
    setupFiles?: string[];
    /** Additional path aliases beyond the defaults (@src, @test) */
    aliases?: Record<string, string>;
    /** Test file patterns to include */
    include?: string[];
    /** Coverage configuration overrides */
    coverage?: object;
    /** Additional vitest test options */
    testOptions?: object;
    /** Whether to use silent mode (useful for apps with noisy console output) */
    silent?: boolean;
    /** Custom reporter (e.g., 'basic' for less verbose output) */
    reporter?: string;
}

/**
 * Creates a standardized vitest configuration for Ghost apps.
 * Provides sensible defaults while allowing customization.
 */
export function createVitestConfig(options: VitestConfigOptions = {}) {
    const {
        setupFiles = ['./test/setup.ts'],
        aliases = {},
        include = [
            './test/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
            './src/**/*.{test,spec}.{js,ts,jsx,tsx}'
        ],
        coverage = {},
        testOptions = {},
        silent = false,
        reporter
    } = options;

    return defineConfig({
        plugins: [react()],
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles,
            include,
            silent,
            ...(reporter && {reporters: reporter}),
            coverage: {
                reporter: ['text', 'html'],
                exclude: [
                    'node_modules/',
                    'test/',
                    'dist/',
                    'build/',
                    '**/*.d.ts',
                    '**/*.config.{js,ts}',
                    '**/vite.config.{js,ts}',
                    '**/vitest.config.{js,ts}'
                ],
                ...coverage
            },
            ...testOptions
        },
        resolve: {
            alias: {
                '@src': path.resolve(process.cwd(), './src'),
                '@test': path.resolve(process.cwd(), './test'),
                ...aliases
            }
        }
    });
} 