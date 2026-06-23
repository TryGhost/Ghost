import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

import {
    mochaRulesOff,
    nodeLibRules,
    strictLinterOptions,
    tsUnusedVarsRule
} from '../../eslint.shared.mjs';

export default tseslint.config(
    {
        ignores: ['build/**/*']
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
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
            ...nodeLibRules,
            ...tsUnusedVarsRule,
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
            ...nodeLibRules,
            ...tsUnusedVarsRule,
            ...mochaRulesOff(ghostPlugin),
            'no-undef': 'off'
        }
    }
);
