import globals from 'globals';
import js from '@eslint/js';
import {fixupPluginRules} from '@eslint/compat';
import {defineConfig} from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybookPlugin from 'eslint-plugin-storybook';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';
import ghostPlugin from 'eslint-plugin-ghost';
import {fileURLToPath} from 'node:url';

const tailwindConfigPath = fileURLToPath(new URL('./tailwind.config.cjs', import.meta.url));
const ghost = fixupPluginRules(ghostPlugin);

export default defineConfig([
    {ignores: ['dist/**', 'build/**', '.storybook/**']},
    ...storybookPlugin.configs['flat/recommended'],
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactPlugin.configs.flat.recommended,
            reactPlugin.configs.flat['jsx-runtime'],
            reactHooks.configs['recommended-latest']
        ],
        plugins: {
            'react-refresh': reactRefresh,
            ghost,
            react: reactPlugin,
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
            parserOptions: {projectService: true, tsconfigRootDir: import.meta.dirname}
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],

            // react-hooks
            'react-hooks/rules-of-hooks': 'error',
            // pre-existing violations carry inline disables; new code must comply
            'react-hooks/exhaustive-deps': 'error',

            // sort multiple import lines into alphabetical groups
            // ignoreMemberSort: the plugin's member-sort autofix calls the removed
            // sourceCode.getComments() API, which crashes ESLint 9; disabling it avoids
            // the crash while keeping import-line ordering (which autofixes cleanly)
            'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
                ignoreMemberSort: true,
                memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
            }],

            // suppress errors for missing 'import React' in JSX files, as we don't need it
            'react/react-in-jsx-scope': 'off',
            // TypeScript validates props at compile time, superseding prop-types
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
        files: ['**/*.stories.{ts,tsx}'],
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off'
        }
    },
    {
        files: ['test/**/*.ts', 'test/**/*.tsx'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.mocha
            },
            parserOptions: {
                project: './tsconfig.test.json',
                projectService: false,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            ...ghostPlugin.configs['ts-test'].rules,
            'ghost/mocha/no-global-tests': 'off',
            'ghost/mocha/handle-done-callback': 'off',
            'ghost/mocha/no-mocha-arrows': 'off',
            'ghost/mocha/max-top-level-suites': 'off',
            // vitest's it.each() builds its cases array in the describe body, which this mocha-oriented rule misfires on
            'ghost/mocha/no-setup-in-describe': 'off'
        }
    }
]);
