import { reactAppConfig } from '@internal/cfg-eslint-react';

export default [
  ...reactAppConfig({
    // UMD bundle (no Vite HMR runtime), so the react-refresh rule is meaningless.
    reactRefresh: false,
    // LEGACY: Tailwind v3. Migration to v4 is a multi-day class/theme rewrite +
    // CDN regression testing. Tracked separately.
    legacyTailwindV3ConfigPath: `${import.meta.dirname}/tailwind.config.cjs`,
    sortImports: true,
    ignores: ['umd/**/*', 'dist/**/*', 'storybook-static/**/*'],
    srcGlobs: ['src/**/*.{js,jsx,ts,tsx,cjs}', 'test/**/*.{js,jsx,ts,tsx,cjs}'],
    testGlobs: false, // single combined src+test block
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
