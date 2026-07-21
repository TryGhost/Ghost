import {defineConfig} from 'eslint/config';
import eslint from '@eslint/js';
import globals from 'globals';

// Self-contained, like the rest of this directory: i18n-review is deliberately
// outside the pnpm workspace (see README), so it can't use @internal/cfg-eslint
// without coupling this tool back to the monorepo.
//
// Plain @eslint/js is the right fit on the merits too — cfg-eslint's nodeLibRules
// encode Ghost server-runtime conventions (@tryghost/errors usage, no console
// output, no top-level await for require(esm) consumers) that a standalone
// GitHub bot doesn't share. What's wanted here is the basics: undefined vars,
// unused vars, unreachable code.
export default defineConfig([
    {
        files: ['**/*.js'],
        extends: [eslint.configs.recommended],
        linterOptions: {
            reportUnusedDisableDirectives: 'error'
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: globals.node
        },
        rules: {
            // ESLint 9 flipped the caughtErrors default to 'all'; keep unused
            // catch bindings tolerated, as the rest of the repo does.
            'no-unused-vars': ['error', {caughtErrors: 'none'}]
        }
    }
]);
