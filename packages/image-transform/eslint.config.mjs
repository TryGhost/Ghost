import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  commonjs: true,
  legacyLocalFilenames: true,
  srcGlobs: ['index.js', 'src/**/*.ts'],
  testGlobs: ['test/**/*.ts'],
  extraSrcRules: {
    '@typescript-eslint/no-require-imports': 'off',
  },
  // Tests stand in for sharp and fs failures with plain errors
  extraTestRules: {
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    'ghost/ghost-custom/no-native-error': 'off',
    'no-redeclare': 'off',
    'prefer-rest-params': 'off',
  },
});
