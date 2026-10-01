import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  typescript: false,
  commonjs: true,
  legacyLocalFilenames: true,
  srcGlobs: ['index.js', 'src/**/*.js'],
  testGlobs: ['test/**/*.js'],
  // Tests stand in for sharp and fs failures with plain errors
  extraTestRules: {
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
