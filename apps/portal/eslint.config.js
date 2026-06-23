import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import i18nextPlugin from 'eslint-plugin-i18next';
import tseslint from 'typescript-eslint';

import {
    jsReactAppRules,
    strictLinterOptions
} from '../../eslint.shared.mjs';

const i18nextFlat = i18nextPlugin.configs['flat/recommended'];
const reactFlat = reactPlugin.configs.flat.recommended;
const reactJsxRuntime = reactPlugin.configs.flat['jsx-runtime'];

export default tseslint.config(
    {
        ignores: ['umd/**/*', 'dist/**/*']
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
    },
    {
        files: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}'],
        ...js.configs.recommended,
        languageOptions: {
            ...reactFlat.languageOptions,
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.vitest,
                ...globals.jest,
                vi: 'readonly',
                require: 'readonly'
            }
        },
        plugins: {
            ...reactFlat.plugins,
            ...i18nextFlat.plugins,
            ghost: ghostPlugin
        },
        settings: {
            react: {version: 'detect'}
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactFlat.rules,
            ...reactJsxRuntime.rules,
            ...i18nextFlat.rules,
            ...jsReactAppRules
        }
    },
    {
        files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {jsx: true},
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname
            },
            globals: {
                ...globals.browser,
                ...globals.vitest,
                ...globals.jest,
                vi: 'readonly'
            }
        },
        plugins: {
            ...reactFlat.plugins,
            ...i18nextFlat.plugins,
            ghost: ghostPlugin
        },
        settings: {
            react: {version: 'detect'}
        },
        rules: {
            ...reactFlat.rules,
            ...reactJsxRuntime.rules,
            ...i18nextFlat.rules,
            ...jsReactAppRules
        }
    }
);
