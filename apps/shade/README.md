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

Shade requires React 18 and Tailwind CSS 4.1+ during the alpha. The app compiles
Shade's `styles.css` together with its own styles using Tailwind's Vite or
PostCSS integration. Shade does not ship a compiled stylesheet.

For an existing React/Vite app:

```sh
pnpm add @tryghost/shade@next react@18 react-dom@18
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

Import Shade and register your app's source directory in the app stylesheet:

```css
/* src/styles.css */
@import "@tryghost/shade/styles.css";
@source "./";

/* Shade's spacing and type scale assumes a 10px root rem. */
html {
    font-size: 62.5%;
}
```

Shade registers its own component sources and supplies the theme, utilities,
animations and base styles. Do not also import `tailwindcss`. Load your preferred
font separately; Shade uses Inter when available and falls back to system fonts.

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
- `pnpm build` — build the JavaScript and type declarations

### Source exports

Admin’s Vite development, production and test configurations select the `source`
export condition to load this package directly from `src/`. Changes reach Vite
without waiting for the library build. Consumers without that condition keep
using the compiled exports; TypeScript continues using the generated declarations.
The library build remains required for those consumers. Published exports only
refer to compiled modules and declarations; the workspace-only `source`
conditions are removed when packing.

## Test

- `pnpm test` — type-checks and runs Vitest with coverage
- `pnpm test:unit` — runs Vitest
- `pnpm test:types` — TypeScript only
- `pnpm lint` — ESLint for `src/` and `test/`

## Publishing

On `main`, CI builds and publishes Shade as `0.1.0-alpha.N` under npm's `next`
tag after the normal checks pass. It uses the existing affected-project selection
and version helper. The committed version selects the alpha series; npm supplies
the latest counter. Dependency changes, CI changes and reruns can produce another
alpha. Documentation-only changes follow the normal CI skip. No release commits
or Git tags are created.

## Notes

- Utilities live at `@/lib/utils` (not `@/utils`). Use `cn(...)` to merge class names and prefer CVA for variants.
- Docs live alongside the code and are rendered via Storybook (`src/docs/*`).
