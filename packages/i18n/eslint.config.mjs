import { nodeLibConfig, noGhostIgnitionRequireRule } from '@internal/cfg-eslint';

export default nodeLibConfig({
  // Also lint the package-root tooling scripts and the translation linter.
  srcGlobs: ['src/**/*.ts', '*.js'],
  testGlobs: ['test/**/*.ts', 'test/**/*.js'],
  extraSrcRules: noGhostIgnitionRequireRule,
  extraTestRules: {
    ...noGhostIgnitionRequireRule,
    'ghost/ghost-custom/node-assert-strict': 'error',
  },
  extraBlocks: [
    {
      // Keep the entry point small — it's public surface.
      files: ['src/index.ts'],
      rules: { 'max-lines': ['error', { skipBlankLines: true, skipComments: true, max: 50 }] },
    },
  ],
});
