import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import storybookPlugin from 'eslint-plugin-storybook';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

const tailwindCssConfig = `${import.meta.dirname}/../admin/src/index.css`;

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
        ignores: ['dist/**/*', 'storybook-static/**/*']
    },
    {
        files: ['src/**/*.{js,ts,cjs,tsx}', 'scripts/**/*.{js,ts,cjs,tsx}'],
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
            'react-refresh': reactRefreshPlugin,
            storybook: storybookPlugin,
            tailwindcss: tailwindcssPlugin
        },
        settings: {
            react: {version: 'detect'},
            tailwindcss: {config: tailwindCssConfig}
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
            'react/jsx-sort-props': ['error', {
                reservedFirst: true,
                callbacksLast: true,
                shorthandLast: true,
                locale: 'en'
            }],
            'react/button-has-type': 'error',
            'react/no-array-index-key': 'error',
            'react/jsx-key': 'off',
            'tailwindcss/classnames-order': 'error',
            'tailwindcss/enforces-negative-arbitrary-values': 'warn',
            'tailwindcss/enforces-shorthand': 'warn',
            'tailwindcss/migration-from-tailwind-2': 'warn',
            'tailwindcss/no-arbitrary-value': 'off',
            'tailwindcss/no-custom-classname': 'off',
            'tailwindcss/no-contradicting-classname': 'error'
        }
    },
    // Storybook story files — render() functions intentionally use hooks
    // and don't need to look like React components
    {
        files: ['**/*.stories.{ts,tsx,js,jsx}'],
        rules: {
            'react-hooks/rules-of-hooks': 'off'
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
            '@typescript-eslint/no-inferrable-types': 'off'
        }
    }
);
