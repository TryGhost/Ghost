import {fixupPluginRules} from '@eslint/compat';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import storybookPlugin from 'eslint-plugin-storybook';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import {fileURLToPath} from 'node:url';

const ghost = fixupPluginRules(ghostPlugin);
const tailwindConfigPath = fileURLToPath(new URL('./tailwind.config.cjs', import.meta.url));

export default [
    {ignores: ['dist/**', 'build/**', '.storybook/**', '**/*.d.ts']},
    eslint.configs.recommended,
    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat['jsx-runtime'],
    ...storybookPlugin.configs['flat/recommended'],
    {
        files: ['demo/**/*.{js,jsx,ts,tsx}', 'src/**/*.{js,jsx,ts,tsx}', 'test/**/*.{js,jsx,ts,tsx}'],
        plugins: {
            ghost,
            'react-hooks': reactHooksPlugin,
            tailwindcss: tailwindcssPlugin
        },
        settings: {
            react: {
                version: 'detect'
            }
        },
        languageOptions: {
            parser: tseslint.parser,
            globals: {
                ...globals.browser,
                ...globals.node
            },
            parserOptions: {
                ecmaFeatures: {jsx: true}
            }
        },
        rules: {
            ...ghostPlugin.configs.browser.rules,

            // match eslint-config-react-app behavior
            'no-unused-vars': ['error', {args: 'none', caughtErrors: 'none', ignoreRestSiblings: true}],

            // react-hooks
            'react-hooks/rules-of-hooks': 'error',
            // pre-existing violations carry inline disables; new code must comply
            'react-hooks/exhaustive-deps': 'error',

            // sort multiple import lines into alphabetical groups
            'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
                memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
            }],

            // suppress errors for missing 'import React' in JSX files, as we don't need it
            'react/react-in-jsx-scope': 'off',
            // ignore prop-types for now
            'react/prop-types': 'off',

            // custom react rules
            'react/jsx-sort-props': ['error', {
                reservedFirst: true,
                callbacksLast: true,
                shorthandLast: true,
                locale: 'en'
            }],
            'react/button-has-type': 'error',
            'react/no-array-index-key': 'error',

            'tailwindcss/classnames-order': ['error', {config: tailwindConfigPath}],
            'tailwindcss/enforces-negative-arbitrary-values': ['error', {config: tailwindConfigPath}],
            'tailwindcss/enforces-shorthand': ['error', {config: tailwindConfigPath}],
            'tailwindcss/migration-from-tailwind-2': ['error', {config: tailwindConfigPath}],
            'tailwindcss/no-arbitrary-value': 'off',
            'tailwindcss/no-custom-classname': 'off',
            'tailwindcss/no-contradicting-classname': ['error', {config: tailwindConfigPath}]
        }
    },
    {
        files: ['test/**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.mocha
            }
        }
    },
    {
        files: ['src/components/ui/cards/*.{jsx,tsx}'],
        ignores: ['src/components/ui/cards/*.stories.{jsx,tsx}'],
        rules: {
            'react/prop-types': 'error'
        }
    }
];
