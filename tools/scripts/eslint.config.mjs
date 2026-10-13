import { nodeLibConfig } from '@internal/cfg-eslint';

// These are CLI entrypoints, not a library, so a few nodeLibConfig defaults
// are relaxed below.
const cliRules = {
  // Writing to stdout/stderr is the entire job of these scripts.
  'no-console': 'off',
  // nodeLibConfig bans top-level await because it breaks `require(esm)`
  // consumers like ghost. Nothing requires these files — they are run
  // directly by node — so the hazard doesn't exist here.
  'no-restricted-syntax': 'off',
  // @tryghost/errors is a server-runtime concern; scripts throw native
  // Errors and let node print the stack.
  'ghost/ghost-custom/no-native-error': 'off',
};

export default [
  ...nodeLibConfig({
    srcGlobs: ['*.ts', 'lib/**/*.ts'],
    testGlobs: ['test/**/*.test.ts'],
    extraSrcRules: cliRules,
    extraTestRules: cliRules,
  }),
];
