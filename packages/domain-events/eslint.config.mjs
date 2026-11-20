import { nodeLibConfig } from '@internal/cfg-eslint';

// Interim state between the file renames and the TypeScript conversion: the
// sources are still CommonJS, and the hand-written declaration files in src/
// are not linted until the conversion replaces them. The filename rule
// crashes on a `module.exports = <class>` file under ESLint 9, so it is off
// until the sources are ESM.
const legacyRules = {
  'ghost/filenames/match-regex': 'off',
  '@typescript-eslint/no-require-imports': 'off',
};

export default nodeLibConfig({
  commonjs: true,
  srcGlobs: ['index.js', 'src/domain-events.ts'],
  testGlobs: ['test/**/*.ts'],
  extraSrcRules: legacyRules,
  // The test still declares `assert` and `sinon` with require().
  extraTestRules: { ...legacyRules, 'no-redeclare': 'off' },
});
