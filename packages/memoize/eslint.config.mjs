import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  extraTestRules: {
    // Tests throw plain errors to prove that a throwing compute is not memoised.
    // A Ghost error would misrepresent what is being modelled: an arbitrary
    // failure inside someone else's compute function.
    'ghost/ghost-custom/no-native-error': 'off',
  },
});
