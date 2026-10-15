import { nodeLibConfig } from '@internal/cfg-eslint';

const cliRules = {
  // Executable commands use top-level await.
  'no-restricted-syntax': 'off',
};

export default [
  ...nodeLibConfig({
    srcGlobs: ['dev-*.ts', 'lib/**/*.ts'],
    testGlobs: ['test/dev*.test.ts'],
    extraSrcRules: { ...cliRules, 'no-console': 'off' },
    extraTestRules: { ...cliRules, 'no-console': 'off' },
  }),
  ...nodeLibConfig({ srcGlobs: ['cli.ts', 'run-ghost-command.ts'], extraSrcRules: cliRules }),
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
  ...nodeLibConfig({
    srcGlobs: [
      'rebuild-in-development-tables.ts',
      'generate-data.ts',
      'multi-sub-scenarios.ts',
      'repl.ts',
      'shift-dates.ts',
      'benchmark-recipient-preparation.ts',
    ],
    extraSrcRules: { ...cliRules, 'no-console': 'off' },
  }),
];
