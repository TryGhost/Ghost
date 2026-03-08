import {fixupPluginRules} from '@eslint/compat';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import storybookPlugin from 'eslint-plugin-storybook';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import globals from 'globals';

const ghost = fixupPluginRules(ghostPlugin);

export default [
    {ignores: ['dist/**', 'build/**', '.storybook/**']},
    eslint.configs.recommended,
    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat['jsx-runtime'],
    ...storybookPlugin.configs['flat/recommended'],
    {
        files: ['demo/**/*.{js,jsx}', 'src/**/*.{js,jsx}', 'test/**/*.{js,jsx}'],
        plugins: {
            ghost,
            'react-hooks': fixupPluginRules(reactHooksPlugin),
            tailwindcss: tailwindcssPlugin
        },
        settings: {
            react: {
                version: 'detect'
            }
        },
        languageOptions: {
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
            'no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none', ignoreRestSiblings: true}],

            // react-hooks
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

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
        files: ['test/**/*.{js,jsx}'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.mocha
            }
        }
    },
    {
        files: ['src/components/ui/cards/*.jsx'],
        ignores: ['src/components/ui/cards/*.stories.jsx'],
        rules: {
            'react/prop-types': 'error'
        }
    }
];
