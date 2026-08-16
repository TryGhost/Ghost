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

The setup below applies only to a standalone surface that owns its complete
application and CSS entry points. Shade is currently a private package; when
published, consumption will follow standard npm usage.

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

For a fresh clone or worktree, follow the setup instructions from the repository
root:

```bash
corepack enable pnpm
pnpm setup
```

After setup, run the package commands below from `apps/shade` or with
`pnpm --filter @tryghost/shade <command>`.

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
