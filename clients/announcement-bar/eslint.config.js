import { reactAppConfig } from '@internal/cfg-eslint-react';

export default [
  ...reactAppConfig({
    reactRefresh: false, // bundled as UMD for theme distribution
    sortImports: true,
    ignores: ['umd/**/*', 'dist/**/*'],
    extraSrcRules: {
      // Preact core sets SVG attributes verbatim, so they must stay kebab-case
      'react/no-unknown-property': [
        'error',
        { ignore: ['stroke-linecap', 'stroke-linejoin', 'stroke-width'] },
      ],
    },
  }),
  {
    // Rendered with Preact; stops eslint-plugin-react from looking for a `react` install
    settings: { react: { version: '18.3' } },
  },
];
