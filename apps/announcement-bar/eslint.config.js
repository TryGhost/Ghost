import {reactAppConfig} from '@internal/cfg-eslint-react';

// LEGACY: vanilla JS (no TypeScript). Should migrate to TS — small surface
// (~6 components, 1–2 days).
export default reactAppConfig({
    typescript: false,
    reactRefresh: false,  // bundled as UMD for theme distribution
    ignores: ['umd/**/*', 'dist/**/*']
});
