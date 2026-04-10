# Shade

Ghost Design System that can be used by micro-frontends.

## Usage

Shade is consumed internally across Ghost apps. The package is currently private; when published, consumption will follow standard npm usage.

Example:

```tsx
import {Button} from '@tryghost/shade/components';

export function Example() {
    return <Button>Continue</Button>;
}
```

CSS-first styling contract:

```css
/* app entry CSS */
@import "@tryghost/shade/styles.css";
```

No Tailwind preset/config import is required for Shade runtime styling.

Scoping and dark mode:

- All styles are scoped under a `.shade` container.
- Dark mode is toggled by adding `.dark` within that scope.

Wrap your surface with `ShadeApp` (includes provider and scoping):

```tsx
import {ShadeApp} from '@tryghost/shade/app';

<ShadeApp darkMode={false}>
    {/* your UI */}
</ShadeApp>
```

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm` to install top-level dependencies.

Local docs with Storybook:

- `pnpm storybook` — run Storybook and view docs under `src/docs/`
- `pnpm build-storybook` — build a static export

## Test

- `pnpm test` — type-checks and runs Vitest with coverage
- `pnpm test:unit` — type-checks and runs Vitest
- `pnpm test:types` — TypeScript only
- `pnpm lint` — ESLint for `src/` and `test/`

## Notes

- Utilities live at `@/lib/utils` (not `@/utils`). Use `cn(...)` to merge class names and prefer CVA for variants.
- Docs live alongside the code and are rendered via Storybook (`src/docs/*`).
