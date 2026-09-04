import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  typescript: false,
  commonjs: true,
  legacyLocalFilenames: true,
  srcGlobs: ['index.js', 'lib/**/*.js'],
  testGlobs: ['test/**/*.js'],
  extraTestRules: {
    // These tests deliberately use native errors to verify rejection and
    // pass-through behavior at the framework boundary.
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
