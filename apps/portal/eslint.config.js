import { reactAppConfig } from '@internal/cfg-eslint-react';

export default [
  ...reactAppConfig({
    // LEGACY: Portal is mid-TS-migration. `src/` has both `.js` and `.ts` files
    // with different parser requirements. Emit two separate src blocks until
    // every `.js` file is converted to `.ts`. Tracked separately — when the
    // migration lands, drop this flag and the workspace becomes a vanilla
    // reactAppConfig() call.
    legacyJsTsSplit: true,
    tsconfigRootDir: import.meta.dirname, // workspace tsconfig.json, not the factory's
    reactRefresh: false, // portal is bundled as UMD for theme distribution
    legacyTailwindV3ConfigPath: `${import.meta.dirname}/tailwind.config.cjs`,
    i18next: true,
    ignores: ['umd/**/*', 'dist/**/*'],
  }),
  {
    // `tw` tags class constants; `classes` is ActionButton's class prop
    settings: { tailwindcss: { tags: ['tw'], classRegex: '^(class(Name)?|classes)$' } },
  },
];
