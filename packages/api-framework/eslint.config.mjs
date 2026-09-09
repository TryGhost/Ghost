import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  extraTestRules: {
    // Tests intentionally exercise propagation of arbitrary native errors.
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
