import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

import {
    correctnessRules,
    reactDefaultsOff,
    sortImportsRule,
    tailwindRulesWithConfig,
    tsUnusedVarsRule
} from '../../eslint.shared.mjs';

const tailwindConfig = `${import.meta.dirname}/tailwind.config.cjs`;

const reactFlat = reactPlugin.configs.flat.recommended;

export default tseslint.config(
    {
        ignores: ['umd/**/*', 'dist/**/*', 'storybook-static/**/*']
    },
    {
        files: ['src/**/*.{js,jsx,ts,tsx,cjs}', 'test/**/*.{js,jsx,ts,tsx,cjs}'],
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
            tailwindcss: tailwindcssPlugin
        },
        settings: {
            react: {version: 'detect'}
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactFlat.rules,
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
            '@typescript-eslint/no-inferrable-types': 'off'
        }
    }
);
