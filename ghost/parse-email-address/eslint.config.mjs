import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

import {
    correctnessRules,
    mochaRulesOff,
    tsUnusedVarsRule
} from '../../eslint.shared.mjs';

const ghostParseEmailExtras = {
    'no-var': 'warn',
    'one-var': ['warn', 'never'],
    'ghost/ghost-custom/no-native-error': 'error',
    'ghost/ghost-custom/ghost-error-usage': 'error',
    'ghost/ghost-custom/ghost-tpl-usage': 'error'
};

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
            ...correctnessRules,
            ...tsUnusedVarsRule,
            ...ghostParseEmailExtras,
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
            ...correctnessRules,
            ...tsUnusedVarsRule,
            ...ghostParseEmailExtras,
            ...mochaRulesOff(ghostPlugin),
            'no-undef': 'off'
        }
    }
);
