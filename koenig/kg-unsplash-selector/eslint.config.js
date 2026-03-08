import {fixupPluginRules} from '@eslint/compat';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

const ghost = fixupPluginRules(ghostPlugin);

export default tseslint.config(
    {ignores: ['dist/**']},
    {
        files: ['src/**/*.{ts,tsx}'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended,
            reactPlugin.configs.flat.recommended,
            reactPlugin.configs.flat['jsx-runtime']
        ],
        plugins: {
            ghost,
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin,
            tailwindcss: tailwindcssPlugin
        },
        settings: {
            react: {
                version: 'detect'
            }
        },
        rules: {
            ...ghostPlugin.configs.ts.rules,

            // disable rules not in the original config
            '@typescript-eslint/no-unused-expressions': 'off',

            // react-hooks
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // sort multiple import lines into alphabetical groups
            'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
                memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
            }],

            'prefer-const': 'off',
            'react-refresh/only-export-components': 'off',

            // suppress errors for missing 'import React' in JSX files, as we don't need it
            'react/react-in-jsx-scope': 'off',
            // ignore prop-types for now
            'react/prop-types': 'off',

            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-empty-function': 'off',

            // custom react rules
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
    }
);
