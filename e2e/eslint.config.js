import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import playwrightPlugin from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths'

export default tseslint.config([
    // Ignore patterns
    {
        ignores: [
            'build/**',
            'data/**',
            'playwright/**',
            'playwright-report/**',
            'test-results/**'
        ]
    },

    // Base config for all TypeScript files
    {
        files: ['**/*.ts', '**/*.mjs'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended
        ],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module'
            }
        },
        plugins: {
            ghost: ghostPlugin,
            playwright: playwrightPlugin,
            'no-relative-import-paths': noRelativeImportPaths,
        },
        rules: {
            // Manually include rules from plugin:ghost/ts and plugin:ghost/ts-test
            // These would normally come from the extends, but flat config requires explicit inclusion
            ...ghostPlugin.configs.ts.rules,

            // Sort multiple import lines into alphabetical groups
            'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
                memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
            }],

            // Enforce kebab-case (lowercase with hyphens) for all filenames
            'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],

            // Apply no-relative-import-paths rule
            'no-relative-import-paths/no-relative-import-paths': [
                'error',
                { allowSameFolder: true, rootDir: './', prefix: '@' },
            ],

            // Restrict imports to specific directories
            'no-restricted-imports': ['error', {
                patterns: ['@/helpers/pages/*']
            }],

            // Disable all mocha rules from ghost plugin since this package uses playwright instead
            ...Object.fromEntries(
                Object.keys(ghostPlugin.rules || {})
                    .filter(rule => rule.startsWith('mocha/'))
                    .map(rule => [`ghost/${rule}`, 'off'])
            )
        }
    },

    // Playwright-specific recommended rules config for test files
    {
        files: ['tests/**/*.ts', 'helpers/playwright/**/*.ts', 'helpers/pages/**/*.ts'],
        rules: {
            ...playwrightPlugin.configs.recommended.rules
        }
    }
]);
