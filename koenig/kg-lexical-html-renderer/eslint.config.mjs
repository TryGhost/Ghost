import {fixupPluginRules} from '@eslint/compat';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ghost = fixupPluginRules(ghostPlugin);

export default tseslint.config(
    {ignores: ['build/**']},
    {
        files: ['lib/**/*.ts'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended
        ],
        plugins: {ghost},
        languageOptions: {
            globals: globals.node
        },
        rules: {
            ...ghostPlugin.configs.ts.rules,
            'ghost/filenames/match-exported-class': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-require-imports': 'off'
        }
    },
    {
        files: ['test/**/*.js'],
        extends: [
            eslint.configs.recommended
        ],
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
            ...ghostPlugin.configs.node.rules,
            'no-unused-vars': ['error', {caughtErrors: 'none'}],
            'ghost/filenames/match-exported-class': 'off',
            'ghost/filenames/match-exported': 'off',
            'ghost/filenames/match-regex': 'off',
            ...ghostPlugin.configs.test.rules,
            'ghost/mocha/max-top-level-suites': 'off'
        }
    }
);
