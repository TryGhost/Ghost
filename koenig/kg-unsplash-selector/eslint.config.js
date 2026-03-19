import {defineConfig} from 'eslint/config';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import tailwindPlugin from 'eslint-plugin-tailwindcss';

export default defineConfig([
    {ignores: ['dist/**', 'types/**']},
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended
        ],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {jsx: true}
            }
        },
        plugins: {
            ghost: ghostPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin,
            tailwindcss: tailwindPlugin
        },
        settings: {
            react: {version: 'detect'}
        },
        rules: {
            ...ghostPlugin.configs.ts.rules,

            // sort multiple import lines into alphabetical groups
            'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
                memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
            }],

            'prefer-const': 'off',
            'react-refresh/only-export-components': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',

            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-empty-function': 'off',

            'react/jsx-sort-props': ['error', {
                reservedFirst: true,
                callbacksLast: true,
                shorthandLast: true,
                locale: 'en'
            }],
            'react/button-has-type': 'error',
            'react/no-array-index-key': 'error',
            'react/jsx-key': 'off',

            'tailwindcss/classnames-order': ['error', {config: 'tailwind.config.cjs'}],
            'tailwindcss/enforces-negative-arbitrary-values': ['warn', {config: 'tailwind.config.cjs'}],
            'tailwindcss/enforces-shorthand': ['warn', {config: 'tailwind.config.cjs'}],
            'tailwindcss/migration-from-tailwind-2': ['warn', {config: 'tailwind.config.cjs'}],
            'tailwindcss/no-arbitrary-value': 'off',
            'tailwindcss/no-custom-classname': 'off',
            'tailwindcss/no-contradicting-classname': ['error', {config: 'tailwind.config.cjs'}]
        }
    },
    {
        files: ['test/**/*.ts'],
        rules: {
            ...ghostPlugin.configs['ts-test'].rules,
            'ghost/mocha/no-global-tests': 'off',
            'ghost/mocha/handle-done-callback': 'off',
            'ghost/mocha/no-mocha-arrows': 'off',
            'ghost/mocha/max-top-level-suites': 'off'
        }
    }
]);
