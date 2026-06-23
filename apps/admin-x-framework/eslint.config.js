import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

import {
    correctnessRules,
    mochaRulesOff,
    reactDefaultsOff,
    reactStrictRules,
    shadeLayeredImportsRule,
    tsUnusedVarsRule
} from '../../eslint.shared.mjs';

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
            ...correctnessRules,
            ...tsUnusedVarsRule,
            ...reactDefaultsOff,
            ...reactStrictRules,
            ...shadeLayeredImportsRule,
            // TS handles these — disable the base ESLint variants
            'no-undef': 'off',
            'no-redeclare': 'off',
            'no-unexpected-multiline': 'off',
            '@typescript-eslint/no-inferrable-types': 'off'
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
            ...correctnessRules,
            ...tsUnusedVarsRule,
            ...mochaRulesOff(ghostPlugin),
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
);
