import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  typescript: false,
  commonjs: true,
  legacyLocalFilenames: true,
  srcGlobs: ['index.js', 'lib/**/*.js'],
  testGlobs: ['test/**/*.js'],
  extraTestRules: {
    // These tests intentionally exercise native errors supplied by callers.
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
