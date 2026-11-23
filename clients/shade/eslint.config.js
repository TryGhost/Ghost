import { reactAppConfig } from '@internal/cfg-eslint-react';

// Shade lints `scripts/` alongside `src/` (one-off build/codegen scripts).
export default reactAppConfig({
  tailwindCssPath: `${import.meta.dirname}/../admin/src/index.css`,
  ignores: ['dist/**/*', 'storybook-static/**/*'],
  srcGlobs: ['src/**/*.{js,ts,cjs,tsx}', 'scripts/**/*.{js,ts,cjs,tsx}'],
  storybook: 'plugin',
  extraSrcRules: {
    // The factory turns this off; Admin hot-updates Shade source, so keep it on here.
    // `assign` lets Object.assign compound components (ListPage.Header…) through.
    'react-refresh/only-export-components': [
      'error',
      { allowConstantExport: true, extraHOCs: ['assign'] },
    ],
  },
});
