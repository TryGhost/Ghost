import { nodeLibConfig } from '@internal/cfg-eslint';

// The imported files keep their PascalCase names (src/DomainEvents.js and its
// test) because Ghost deep-imports `@tryghost/domain-events/lib/DomainEvents`.
// Renaming belongs to the modernization follow-up, so the filename rule is off
// until then.
const legacyFilenames = { 'ghost/filenames/match-regex': 'off' };

export default nodeLibConfig({
  typescript: false,
  commonjs: true,
  srcGlobs: ['index.js', 'src/**/*.js'],
  testGlobs: ['test/**/*.js'],
  extraSrcRules: legacyFilenames,
  extraTestRules: legacyFilenames,
});
