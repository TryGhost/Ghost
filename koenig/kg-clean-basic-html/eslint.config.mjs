import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import ghostPlugin from 'eslint-plugin-ghost';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['build/**', 'cjs/**', 'es/**'] },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { ghost: ghostPlugin },
    rules: {
      ...ghostPlugin.configs.ts.rules,
      // Formatting is owned by Oxfmt; keep the non-formatting rules ts-no-style also switches off
      ...ghostPlugin.configs['ts-no-style'].rules,
      camelcase: ghostPlugin.configs.ts.rules.camelcase,
      curly: ghostPlugin.configs.ts.rules.curly,
      'dot-notation': ghostPlugin.configs.ts.rules['dot-notation'],
      '@typescript-eslint/no-explicit-any': 'error',
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
    },
  },
]);
