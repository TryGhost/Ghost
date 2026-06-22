import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
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
    'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
};

const mochaRulesOff = Object.fromEntries(
    Object.keys(ghostPlugin.rules || {})
        .filter(rule => rule.startsWith('mocha/'))
        .map(rule => [`ghost/${rule}`, 'off'])
);

const reactFlat = reactPlugin.configs.flat.recommended;

export default tseslint.config(
    {
        ignores: ['dist/**/*']
    },
    {
        files: ['src/**/*.{js,ts,cjs,tsx}'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ...reactFlat.languageOptions,
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            ...reactFlat.plugins,
            ghost: ghostPlugin,
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin
        },
        settings: {
            react: {version: 'detect'}
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactFlat.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            ...ghostRules,
            // TS handles these — disable the base ESLint variants
            'no-undef': 'off',
            'no-redeclare': 'off',
            'no-unexpected-multiline': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'no-restricted-imports': ['error', {
                paths: [{
                    name: '@tryghost/shade',
                    message: 'Import from layered subpaths instead (components/primitives/patterns/utils/app/tokens).'
                }]
            }],
            'react/jsx-sort-props': ['error', {
                reservedFirst: true,
                callbacksLast: true,
                shorthandLast: true,
                locale: 'en'
            }],
            'react/button-has-type': 'error',
            'react/no-array-index-key': 'error',
            'react/jsx-key': 'off'
        }
    },
    {
        files: ['test/**/*.{js,ts,cjs,tsx}'],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.vitest,
                vi: 'readonly'
            }
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
            ...ghostRules,
            ...mochaRulesOff,
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
);
