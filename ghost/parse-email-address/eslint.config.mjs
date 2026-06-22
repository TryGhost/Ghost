import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

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
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'none'
    }],
    'no-var': 'warn',
    'one-var': ['warn', 'never'],
    'ghost/ghost-custom/no-native-error': 'error',
    'ghost/ghost-custom/ghost-error-usage': 'error',
    'ghost/ghost-custom/ghost-tpl-usage': 'error',
    'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
};

const mochaRulesOff = Object.fromEntries(
    Object.keys(ghostPlugin.rules || {})
        .filter(rule => rule.startsWith('mocha/'))
        .map(rule => [`ghost/${rule}`, 'off'])
);

export default tseslint.config(
    {
        ignores: ['build/**/*']
    },
    {
        files: ['src/**/*.ts'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.node
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            ...ghostRules,
            'no-undef': 'off'
        }
    },
    {
        files: ['test/**/*.ts'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.mocha,
                ...globals.vitest,
                vi: 'readonly',
                should: 'readonly',
                sinon: 'readonly'
            }
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
            ...js.configs.recommended.rules,
            ...ghostRules,
            ...mochaRulesOff,
            'no-undef': 'off'
        }
    }
);
