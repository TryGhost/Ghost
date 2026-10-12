import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  // Contributor commands report errors directly and run using Node built-ins.
  extraSrcRules: { 'ghost/ghost-custom/no-native-error': 'off' },
});
