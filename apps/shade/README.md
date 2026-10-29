# Shade

Shade is Ghost's design system for React apps: the tokens, layout primitives,
components, patterns and page templates that Ghost Admin is built with.

## Install in an app

These steps are for a standalone surface: an app that owns its page, rather
than one bundled into Ghost Admin.

Building a Ghost app, which runs framed inside Admin? Follow
[Using Shade in a Ghost app](https://github.com/TryGhost/Ghost/blob/main/apps/shade/src/docs/ghost-apps.mdx)
instead: it also covers fonts, Admin's theme and the page frame.

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

`ShadeApp` also renders the toaster. Show toasts with `toast` from
`@tryghost/shade/components`, such as `toast.success('Saved')`. Don't add
`sonner` as a dependency: a second copy of it shows nothing.

Import from the layer subpaths, such as `@tryghost/shade/components` and
`@tryghost/shade/primitives`, never the root `@tryghost/shade`.

## Inside Ghost Admin

Shade is already set up. Ghost Admin provides Shade's CSS and the `ShadeApp`
wrapper centrally, so embedded Admin apps, including `apps/admin` and
`apps/activitypub`, must not import `@tryghost/shade/styles.css` or add another
`ShadeApp`. They only import components:

```tsx
import {Button} from '@tryghost/shade/components';

export function Example() {
    return <Button>Continue</Button>;
}
```

## Docs

Shade's docs are its Storybook: how to use tokens, primitives, components,
patterns and page templates, with live examples. Browse it at
[shade.ghost.org](https://shade.ghost.org), read the sources in
[`src/docs/`](https://github.com/TryGhost/Ghost/tree/main/apps/shade/src/docs)
on GitHub, or run it from a Ghost checkout with `pnpm storybook` in
`apps/shade`.

## Working on Shade?

See [CONTRIBUTING.md](https://github.com/TryGhost/Ghost/blob/main/apps/shade/CONTRIBUTING.md)
for development, layers, conventions, tests and publishing.
