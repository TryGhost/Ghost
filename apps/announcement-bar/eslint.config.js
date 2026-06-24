import {reactAppConfig} from '../../eslint.shared.mjs';

// LEGACY: vanilla JS (no TypeScript). Should migrate to TS — small surface
// (~6 components, 1–2 days).
export default await reactAppConfig({
    typescript: false,
    reactRefresh: false,  // bundled as UMD for theme distribution
    ignores: ['umd/**/*', 'dist/**/*']
});
