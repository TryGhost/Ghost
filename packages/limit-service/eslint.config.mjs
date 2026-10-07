import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  extraTestRules: {
    // Tests throw plain errors to fail themselves and to check that unexpected ones
    // propagate. A Ghost error would be the wrong thing in both cases.
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
