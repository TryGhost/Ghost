import ghostPlugin from 'eslint-plugin-ghost';
import playwrightPlugin from 'eslint-plugin-playwright';
import tsParser from '@typescript-eslint/parser';

export default [
    // Ignore patterns
    {
        ignores: ['build/**']
    },

    // Base config for all TypeScript files
    {
        files: ['**/*.ts', '**/*.mjs'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module'
            }
        },
        plugins: {
            ghost: ghostPlugin,
            playwright: playwrightPlugin
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

            // Disable all mocha rules from ghost plugin since this package uses playwright instead
            'ghost/mocha/no-exclusive-tests': 'off',
            'ghost/mocha/no-pending-tests': 'off',
            'ghost/mocha/no-skipped-tests': 'off',
            'ghost/mocha/handle-done-callback': 'off',
            'ghost/mocha/no-synchronous-tests': 'off',
            'ghost/mocha/no-global-tests': 'off',
            'ghost/mocha/no-return-and-callback': 'off',
            'ghost/mocha/no-return-from-async': 'off',
            'ghost/mocha/valid-test-description': 'off',
            'ghost/mocha/valid-suite-description': 'off',
            'ghost/mocha/no-mocha-arrows': 'off',
            'ghost/mocha/no-hooks': 'off',
            'ghost/mocha/no-hooks-for-single-case': 'off',
            'ghost/mocha/no-sibling-hooks': 'off',
            'ghost/mocha/no-top-level-hooks': 'off',
            'ghost/mocha/no-identical-title': 'off',
            'ghost/mocha/max-top-level-suites': 'off',
            'ghost/mocha/no-nested-tests': 'off',
            'ghost/mocha/no-setup-in-describe': 'off',
            'ghost/mocha/prefer-arrow-callback': 'off',
            'ghost/mocha/no-async-describe': 'off'
        }
    },

    // Playwright-specific recommended rules config for test files
    {
        files: ['tests/**/*.ts', 'helpers/playwright/**/*.ts', 'helpers/pages/**/*.ts'],
        rules: {
            ...playwrightPlugin.configs.recommended.rules
        }
    }
];
