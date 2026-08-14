import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';

export default [
    {
        ignores: ['umd/**/*.js']
    },
    {
        files: ['src/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.jquery
            }
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
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
            'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
        }
    },
    {
        files: ['test/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                afterEach: 'readonly',
                describe: 'readonly',
                it: 'readonly'
            }
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
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
            'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
        }
    }
];
