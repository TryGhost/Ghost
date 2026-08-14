import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import i18nextPlugin from 'eslint-plugin-i18next';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

import {
    correctnessRules,
    reactDefaultsOff,
    sortImportsRule,
    tailwindRulesWithConfig,
    tsUnusedVarsRule
} from '../../eslint.shared.mjs';

const tailwindConfig = `${import.meta.dirname}/tailwind.config.js`;

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
            ...correctnessRules,
            ...tsUnusedVarsRule,
            ...sortImportsRule,
            ...reactDefaultsOff,
            'react/jsx-sort-props': ['error', {
                reservedFirst: true,
                callbacksLast: true,
                shorthandLast: true,
                locale: 'en'
            }],
            'react/button-has-type': 'error',
            'react/no-array-index-key': 'error',
            ...tailwindRulesWithConfig(tailwindConfig),
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-undef': 'off'
        }
    }
);
