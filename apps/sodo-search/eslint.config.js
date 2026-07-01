import {reactAppConfig} from '../../eslint.shared.mjs';

// LEGACY: vanilla JS (no TypeScript). sodo-search should migrate to TS — small
// surface (~6 components) so the migration is 1–2 days. Until then, the
// typescript: false flag is the escape hatch.
export default await reactAppConfig({
    typescript: false,
    reactRefresh: false,  // bundled as UMD for theme distribution
    sortImports: true,
    ignores: ['umd/**/*', 'dist/**/*']
});
