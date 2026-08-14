import js from '@eslint/js';
import globals from 'globals';
import ghostPlugin from 'eslint-plugin-ghost';

import {correctnessRules, strictLinterOptions} from '@internal/cfg-eslint';

// Standalone (not factory-based) because admin-toolbar is Preact (~3KB) + JS
// hyperscript, served as a UMD bundle via CDN — see README. Neither factory
// fits: reactAppConfig would load eslint-plugin-react/react-hooks for code
// that doesn't use them, and nodeLibConfig assumes Node globals. The base
// rules come from the shared correctnessRules atom.

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
            globals: globals.browser
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
