import {fixupPluginRules} from '@eslint/compat';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import globals from 'globals';

const ghost = fixupPluginRules(ghostPlugin);

export default [
    {ignores: ['build/**', 'cjs/**', 'es/**']},
    eslint.configs.recommended,
    {
        files: ['**/*.js'],
        plugins: {ghost},
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            }
        },
        rules: {
            ...ghostPlugin.configs.node.rules,
            // match ESLint 8 behavior for catch clause variables
            'no-unused-vars': ['error', {caughtErrors: 'none'}],
            // disable rules incompatible with ESLint 9 flat config
            'ghost/filenames/match-exported-class': 'off',
            'ghost/filenames/match-exported': 'off',
            'ghost/filenames/match-regex': 'off'
        }
    },
    {
        files: ['test/**/*.js'],
        plugins: {ghost},
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.mocha,
                should: true,
                sinon: true
            }
        },
        rules: {
            ...ghostPlugin.configs.test.rules
        }
    }
];
