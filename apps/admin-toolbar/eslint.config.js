import { reactAppConfig } from '@internal/cfg-eslint-react';

export default [
  ...reactAppConfig({
    reactRefresh: false, // bundled as an IIFE for the CDN
    ignores: ['umd/**/*'],
  }),
  {
    // Rendered with Preact; stops eslint-plugin-react from looking for a `react` install
    settings: { react: { version: '18.3' } },
  },
];
