# Shade

Ghost Design System that can be used by micro-frontends.

## Usage

Shade is consumed internally across Ghost apps. The package is currently private; when published, consumption will follow standard npm usage.

Example:

```tsx
import {Button} from '@tryghost/shade';

export function Example() {
    return <Button>Continue</Button>;
}
```

Tailwind preset:

```js
// tailwind.config.cjs
module.exports = {
    presets: [require('@tryghost/shade/tailwind')],
    // your overrides...
};
```

Scoping and dark mode:

- All styles are scoped under a `.shade` container.
- Dark mode is toggled by adding `.dark` within that scope.

Wrap your surface with `ShadeApp` (includes provider and scoping):

```tsx
import ShadeApp from '@tryghost/shade';

<ShadeApp darkMode={false}>
    {/* your UI */}
</ShadeApp>
```

Tailwind v4 setup:

- Shade uses the Tailwind CSS v4 CSS API. Theme tokens live directly in `styles.css` under a single `@theme { ... }` block (colors, spacing, fonts, radii, shadows, breakpoints, animations).
- The JS config is minimal and only keeps `important: '.shade'` for scoping. All other theme values are defined in CSS.
- Add or change tokens by editing `styles.css` and defining `--color-*`, `--spacing-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--container-*`, etc. inside `@theme`.
- Variants and plugins are registered in CSS: use `@custom-variant` (e.g., `dark`) and `@plugin "tailwindcss-animate"`.
- Preflight is disabled via inline config: `@config { preflight: false; }` — we keep our own reset via `@import './preflight.css' layer(base);`.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.

Local docs with Storybook:

- `yarn storybook` — run Storybook and view docs under `src/docs/`
- `yarn build-storybook` — build a static export

## Test

- `yarn test` — type-checks and runs Vitest with coverage
- `yarn test:unit` — type-checks and runs Vitest
- `yarn test:types` — TypeScript only
- `yarn lint` — ESLint for `src/` and `test/`

## Notes

- Utilities live at `@/lib/utils` (not `@/utils`). Use `cn(...)` to merge class names and prefer CVA for variants.
- Docs live alongside the code and are rendered via Storybook (`src/docs/*`).
