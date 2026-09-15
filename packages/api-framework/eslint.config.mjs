import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  typescript: false,
  commonjs: true,
  legacyLocalFilenames: true,
  srcGlobs: ['index.js', 'lib/**/*.js'],
  testGlobs: ['test/**/*.js'],
  extraTestRules: {
    // Tests intentionally exercise propagation of arbitrary native errors.
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
