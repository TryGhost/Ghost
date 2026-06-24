import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';

import {
    correctnessRules,
    sortImportsRule
} from '../../eslint.shared.mjs';

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
        ...correctnessRules,
        ...sortImportsRule,
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
