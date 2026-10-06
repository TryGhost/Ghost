import { nodeLibConfig } from '@internal/cfg-eslint';

// Worker errors are transport errors, not Ghost Core runtime exceptions.
export default nodeLibConfig({
  srcGlobs: ['src/**/*.ts', 'scripts/**/*.ts'],
  testGlobs: ['test/**/*.test.ts'],
  extraSrcRules: { 'ghost/ghost-custom/no-native-error': 'off', 'no-console': 'off' },
  extraTestRules: { 'ghost/ghost-custom/no-native-error': 'off' },
});
