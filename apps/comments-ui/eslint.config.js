import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import i18nextPlugin from 'eslint-plugin-i18next';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

const tailwindConfig = `${import.meta.dirname}/tailwind.config.js`;

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
    'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false],
    'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
        memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
    }]
};

const reactFlat = reactPlugin.configs.flat.recommended;
const i18nextFlat = i18nextPlugin.configs['flat/recommended'];

export default tseslint.config(
    {
        ignores: ['umd/**/*', 'dist/**/*']
    },
    {
        files: ['src/**/*.{js,jsx,ts,tsx}'],
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
            ...i18nextFlat.plugins,
            ghost: ghostPlugin,
            tailwindcss: tailwindcssPlugin
        },
        settings: {
            react: {version: 'detect'}
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactFlat.rules,
            ...i18nextFlat.rules,
            ...ghostRules,
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/jsx-sort-props': ['error', {
                reservedFirst: true,
                callbacksLast: true,
                shorthandLast: true,
                locale: 'en'
            }],
            'react/button-has-type': 'error',
            'react/no-array-index-key': 'error',
            'tailwindcss/classnames-order': ['error', {config: tailwindConfig}],
            'tailwindcss/enforces-negative-arbitrary-values': ['warn', {config: tailwindConfig}],
            'tailwindcss/enforces-shorthand': ['warn', {config: tailwindConfig}],
            'tailwindcss/migration-from-tailwind-2': ['warn', {config: tailwindConfig}],
            'tailwindcss/no-arbitrary-value': 'off',
            'tailwindcss/no-custom-classname': 'off',
            'tailwindcss/no-contradicting-classname': ['error', {config: tailwindConfig}],
            'no-undef': 'off'
        }
    }
);
