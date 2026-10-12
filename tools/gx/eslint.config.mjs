import { nodeLibConfig } from '@internal/cfg-eslint';

const cliRules = {
  // Executable commands use top-level await and report native errors directly.
  'no-restricted-syntax': 'off',
  'ghost/ghost-custom/no-native-error': 'off',
};

export default [
  ...nodeLibConfig({ srcGlobs: ['cli.ts'], extraSrcRules: cliRules }),
  ...nodeLibConfig({
    typescript: false,
    srcGlobs: ['create-package.js'],
    extraSrcRules: cliRules,
  }),
];
