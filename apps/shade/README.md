# Shade

Ghost Design System that can be used by micro-frontends.

## Usage in embedded Ghost Admin apps

Ghost Admin provides Shade's CSS and application wrapper centrally. Embedded
Admin surfaces, including `apps/admin` and `apps/activitypub`, must not import
`@tryghost/shade/styles.css` or add another `ShadeApp` wrapper. Import
components from their layer-specific subpaths:

Example:

```tsx
import {Button} from '@tryghost/shade/components';

export function Example() {
    return <Button>Continue</Button>;
}
```

## Usage in standalone surfaces

Building a Ghost app, which runs framed inside Admin? Follow `docs/ghost-apps.md`
in the installed package instead: it also covers fonts, Admin's theme and the
page frame.

Shade requires React 18 and Tailwind CSS 4.1+. The app compiles Shade's
`styles.css` together with its own styles using Tailwind's Vite or PostCSS
integration. Shade does not ship a compiled stylesheet.

For an existing React/Vite app:

```sh
pnpm add @tryghost/shade@alpha react@18 react-dom@18
pnpm add -D tailwindcss@^4.1 @tailwindcss/vite@^4.1
```

Add Tailwind to the app's Vite plugins:

```ts
// vite.config.ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()]
});
```

Import Shade and register the app's sources in the app stylesheet:

```css
/* src/styles.css */
@import "@tryghost/shade/styles.css";
@source "./";

/* Shade's spacing and type scale assumes a 10px root rem. */
html {
    font-size: 62.5%;
}
```

The published stylesheet registers Shade's sources automatically. The app's
`@source` path is relative to this stylesheet.

Shade supplies the theme, utilities, animations and base styles. Do not also
import `tailwindcss`. Load your preferred font separately; Shade uses Inter when
available and falls back to system fonts.

Import the stylesheet once and wrap the app with `ShadeApp`:

```tsx
// src/main.tsx
import {createRoot} from 'react-dom/client';
import {ShadeApp} from '@tryghost/shade/app';
import {Button} from '@tryghost/shade/components';
import './styles.css';

createRoot(document.getElementById('root')!).render(
    <ShadeApp darkMode={false} className="min-h-dvh p-6">
        <Button>Save changes</Button>
    </ShadeApp>
);
```

`ShadeApp` supplies the `.shade` container and providers. For dark mode, add
`.dark` to `document.documentElement` and pass the same state to `ShadeApp` so
portalled menus and dialogs receive the theme too.

This setup is for a standalone app that owns its document. Shade includes
document-level theme variables and base styles. Embedded Admin apps inherit
Admin's stylesheet and application wrapper instead.

## Develop

This is a monorepo package.

For a fresh clone or worktree, follow the setup instructions from the repository
root:

```bash
corepack enable pnpm
pnpm bootstrap
```

After setup, run the package commands below from `apps/shade` or with
`pnpm --filter @tryghost/shade <command>`.

Local docs with Storybook:

- `pnpm storybook` — run Storybook and view docs under `src/docs/`
- `pnpm build-storybook` — build a static export
- `pnpm build` — build the JavaScript, type declarations and Markdown docs

### Docs for agents

The package ships its Storybook docs as Markdown in `docs/`, starting at
`docs/index.md`, so agents read the rules for the installed version.
`scripts/build-docs.ts` generates them from `src/**/*.mdx` during `pnpm build`
(or `pnpm build:docs`). Edit the `.mdx` sources, never the generated `.md` files.

The package also ships agent skills in `skills/`, one folder per skill. Each
says when to apply which doc and links into `docs/`, so the rules stay in one
place. In an app, point the agent at `node_modules/@tryghost/shade/skills/`.
The skills link to `../../docs/`, so read them in place rather than copying
them out of the package.

Agents don't load skills from `node_modules`, so a Ghost app starts from the
entry skill in `entry-skill/shade-for-ghost-apps/`. It installs Shade and points
the agent at the shipped skills and docs. It isn't in the package; install it
from GitHub with the [`skills` CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add TryGhost/Ghost/apps/shade/entry-skill/shade-for-ghost-apps
```

### Source exports

Admin’s Vite development, production and test configurations select the `source`
export condition to load this package directly from `src/`. Changes reach Vite
without waiting for the library build. Consumers without that condition keep
using the compiled exports; TypeScript continues using the generated declarations.
The library build remains required for those consumers. Published exports only
refer to compiled modules and declarations; the workspace-only `source`
conditions are removed when packing.

### Test in an external app

`pnpm pack:local <app-dir>` builds Shade, packs it exactly as CI publishes it,
stamps the version as `<x.y.z>-local.<YYYYMMDD-HHMMSS>`, installs it into an npm
app with `npm install --no-save` and clears the app's Vite cache. The app's
`package.json` and lockfile don't change. Restart the app's dev server to pick
it up. `--watch` also runs the app's `npm run dev` and repeats the install on
every change under `src/` (add `-- <args>` to pass arguments to the dev server).
Run `npm install` in the app to go back to the published release.

## Test

- `pnpm test` — type-checks and runs Vitest with coverage
- `pnpm test:unit` — runs Vitest
- `pnpm test:types` — TypeScript only
- `pnpm lint` — ESLint for `src/` and `test/`

## Publishing

Shade is on the continuous publish lane as a `prerelease` entry in
[`tools/scripts/release/publish-manifest.json`](../../tools/scripts/release/publish-manifest.json).
When a merge to `main` changes what Shade ships, CI publishes the next
`0.1.0-alpha.N` under npm's `alpha` tag. The committed version selects the alpha
series and npm holds the counter, so no release commits or Git tags are created.
See [Shipping](../../docs/contributing/shipping.md#continuous-lane) for the
release gates and the unchanged-package check.

## Notes

- Utilities live at `@/lib/utils` (not `@/utils`). Use `cn(...)` to merge class names and prefer CVA for variants.
- Docs live alongside the code and are rendered via Storybook (`src/docs/*`).
