import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';

import {correctnessRules, strictLinterOptions} from '../../eslint.shared.mjs';

// Standalone (not factory-based) because admin-toolbar is vanilla JS + jQuery,
// no React. Adding it to reactAppConfig with `typescript: false, reactRefresh:
// false` would still load eslint-plugin-react unnecessarily. The base rules
// come from the shared correctnessRules atom.

export default [
    {
        ignores: ['umd/**/*.js']
    },
    {
        files: ['**/*'],
        ...strictLinterOptions
    },
    {
        files: ['src/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.jquery
            }
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
            ...correctnessRules
        }
    },
    {
        files: ['test/**/*.js'],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                afterEach: 'readonly',
                describe: 'readonly',
                it: 'readonly'
            }
        },
        plugins: {
            ghost: ghostPlugin
        },
        rules: {
            ...correctnessRules
        }
    }
];
