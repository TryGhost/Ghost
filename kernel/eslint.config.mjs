import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  testGlobs: false,
  // The posture these files had under ghost/eslint.config.mjs: compiled to
  // CommonJS with some require() calls, TypeScript overloads, and `any` where
  // an adapter or a legacy module is untyped.
  extraSrcRules: {
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-redeclare': 'off',
  },
});
