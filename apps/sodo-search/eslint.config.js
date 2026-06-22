import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';

const ghostRules = {
    curly: 'error',
    camelcase: ['error', {properties: 'never'}],
    'dot-notation': 'error',
    eqeqeq: ['error', 'always'],
    'no-plusplus': ['error', {allowForLoopAfterthoughts: true}],
    'no-eval': 'error',
    'no-useless-call': 'error',
    'no-console': 'error',
    'no-shadow': 'error',
    'array-callback-return': 'error',
    'no-constructor-return': 'error',
    'no-promise-executor-return': 'error',
    'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],
    'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
        memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
    }]
};

const baseConfig = {
    ...js.configs.recommended,
    ...reactPlugin.configs.flat.recommended,
    plugins: {
        ...reactPlugin.configs.flat.recommended.plugins,
        ghost: ghostPlugin
    },
    settings: {
        react: {version: 'detect'}
    },
    rules: {
        ...js.configs.recommended.rules,
        ...reactPlugin.configs.flat.recommended.rules,
        ...ghostRules,
        'react/prop-types': 'off'
    }
};

export default [
    {
        ignores: ['umd/**/*', 'dist/**/*']
    },
    {
        ...baseConfig,
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ...reactPlugin.configs.flat.recommended.languageOptions,
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.browser
        }
    },
    {
        ...baseConfig,
        files: ['test/**/*.{js,jsx}'],
        languageOptions: {
            ...reactPlugin.configs.flat.recommended.languageOptions,
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.vitest,
                ...globals.jest,
                vi: 'readonly'
            }
        }
    }
];
