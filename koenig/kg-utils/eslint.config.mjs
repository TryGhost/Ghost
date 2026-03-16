import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

export default tseslint.config([
    {ignores: ['build/**']},
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended
        ],
        languageOptions: {
            parserOptions: {ecmaVersion: 2022, sourceType: 'module'}
        },
        plugins: {ghost: ghostPlugin},
        rules: {
            ...ghostPlugin.configs.ts.rules,
            '@typescript-eslint/no-explicit-any': 'error'
        }
    },
    {
        files: ['test/**/*.ts'],
        rules: {
            ...ghostPlugin.configs['ts-test'].rules,
            'ghost/mocha/no-global-tests': 'off',
            'ghost/mocha/handle-done-callback': 'off',
            'ghost/mocha/no-mocha-arrows': 'off',
            'ghost/mocha/max-top-level-suites': 'off'
        }
    }
]);
