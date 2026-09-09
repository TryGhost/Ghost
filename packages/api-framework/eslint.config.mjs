import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  typescript: false,
  commonjs: true,
  legacyLocalFilenames: true,
  srcGlobs: ['index.js', 'src/**/*.ts'],
  testGlobs: ['test/**/*.ts'],
  extraTestRules: {
    // Tests intentionally exercise propagation of arbitrary native errors.
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
