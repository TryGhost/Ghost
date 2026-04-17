import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['build/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: { ghost: ghostPlugin },
    rules: {
      ...ghostPlugin.configs.ts.rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      ...ghostPlugin.configs['ts-test'].rules,
      'ghost/mocha/no-global-tests': 'off',
      'ghost/mocha/handle-done-callback': 'off',
      'ghost/mocha/no-mocha-arrows': 'off',
      'ghost/mocha/max-top-level-suites': 'off',
      'ghost/mocha/no-setup-in-describe': 'off',
    },
  },
]);
