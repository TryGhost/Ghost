import {fixupPluginRules} from '@eslint/compat';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ghost = fixupPluginRules(ghostPlugin);

export default tseslint.config(
    {ignores: ['build/**']},
    {
        files: ['src/**/*.ts'],
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
            // disable rules not in the original ghost/ts config
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-require-imports': 'off'
        }
    },
    {
        files: ['test/**/*.ts'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended
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
            ...ghostPlugin.configs.ts.rules,
            ...ghostPlugin.configs['ts-test'].rules,
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off'
        }
    }
);
