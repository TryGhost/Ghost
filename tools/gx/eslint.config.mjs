import { nodeLibConfig } from '@internal/cfg-eslint';

const cliRules = {
  // Executable commands use top-level await and report native errors directly.
  'no-restricted-syntax': 'off',
  'ghost/ghost-custom/no-native-error': 'off',
};

export default [
  ...nodeLibConfig({ srcGlobs: ['cli.ts'], extraSrcRules: cliRules }),
  ...nodeLibConfig({
    srcGlobs: ['create-package.ts'],
    extraSrcRules: cliRules,
  }),
  ...nodeLibConfig({
    srcGlobs: ['generate-golden-email.ts'],
    // Preserve the migrated command's terminal output.
    extraSrcRules: { ...cliRules, 'no-console': 'off' },
  }),
  ...nodeLibConfig({
    srcGlobs: ['create-migration.ts'],
    extraSrcRules: { ...cliRules, 'no-console': 'off' },
  }),
];
