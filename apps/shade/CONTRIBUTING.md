# Contributing to Shade

This guide is for working on Shade itself: adding or changing tokens,
primitives, components, patterns and page templates. To use Shade in an app,
start with the [README](./README.md) and the docs in Storybook.

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

- `pnpm storybook` — run Storybook and view the docs
- `pnpm build-storybook` — build a static export
- `pnpm build` — build the JavaScript and type declarations
- `pnpm pack:local <app-dir>` — [try Shade in an external app](#test-in-an-external-app)

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

## Docs

The docs live beside the code as `.mdx` files, in `src/docs/` and next to
components, and Storybook renders them. Update them when a shared convention
changes, so the rule lives in one place.

The docs are for people using Shade. Rules for changing Shade itself belong in
this file.

## Layers

Shade is a stack of layers. Each layer has one job and lives in one folder.
Pick the right layer when you build, and the rest of the system answers itself.

### The stack

| Layer              | What it is                                                           | Lives in                                    | Examples                                                          |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| **Tokens**         | Named visual values (colour, size, duration). No markup.             | `theme-variables.css`, `tailwind.theme.css` | `--background`, `--text-base`, `--radius-md`                      |
| **Primitives**     | Layout vocabulary — rows, columns, padding, gaps. No domain meaning. | `src/components/primitives/`                | `Stack`, `Inline`, `Box`, `Grid`, `Container`, `Text`             |
| **Components**     | Generic, accessible UI controls. Same on every page.                 | `src/components/ui/`                        | `Button`, `Input`, `Dialog`, `Tabs`, `Card`                       |
| **Recipes**        | Shared visual rules (class-string functions). No JSX.                | `src/components/ui/<name>.ts`               | `inputSurface` — chrome shared by Input, Textarea, Select trigger |
| **Patterns**       | Product-shaped compositions. Know Ghost.                             | `src/components/patterns/`                  | `PageHeader`, `Filters`, `KpiCard`, `GhAreaChart`                 |
| **Page templates** | Top-level page wrappers that compose patterns.                       | `src/components/page-templates/`            | `ListPage`                                                        |

Each layer is allowed to use anything below it. The reverse is forbidden: a
Button can't reach into a Pattern, a Primitive can't import a Component.

### Picking a layer

Ask: **what is this thing doing?**

- Changing spacing, alignment, or structure? → **Primitive** (`Stack`, `Inline`, `Box`, `Grid`, `Container`).
- A generic interactive control with no Ghost-specific knowledge? → **Component** (use an existing one; otherwise add to `components/ui/`).
- The same chrome, focus ring, or visual rule appears on multiple components? → **Recipe** (a class-string function in `components/ui/`).
- It knows about Ghost — KPIs, members, posts, newsletters? → **Pattern** (`components/patterns/<name>.tsx`).

Quick gut check: **generic name → component; Ghost-shaped name → pattern.**
`Button` is web-y. `KpiCard` is Ghost-y.

### When to add to Shade at all

The default is to **keep code local first**. A component used in one place
doesn't belong in a design system.

Promote to Shade when:

1. **Real reuse exists, not expected reuse.** You've already built substantially the same shape a second time in a different surface.
2. **The shape has settled.** Slots and composition have been stable across both local copies for at least one iteration.
3. **The name is generic.** `PageHeader`, `KpiCard`, `Filters` describe concepts. `MembersFilterBar` names a single surface and will date the moment that surface changes.
4. **API is slots, not props.** 3–6 named subcomponents (`.Title`, `.Actions`, `.Body`) — not a prop bag.
5. **State stays with the consumer.** No `useQuery` inside a pattern. No app context reads. Bring-your-own state.

When in doubt: **keep it local**, build it again somewhere else, then promote.

## Conventions

### File layout

```text
apps/shade/
├── .storybook/              Storybook configuration
├── theme-variables.css      Semantic tokens and dark-mode values
├── tailwind.theme.css       Tailwind theme mappings and raw tokens
└── src/
    ├── components/
    │   ├── ui/              Generic controls + recipes
    │   ├── primitives/      Layout primitives (Stack, Inline, …)
    │   ├── patterns/        Product compositions (PageHeader, KpiCard, …)
    │   └── page-templates/  Top-level page wrappers (ListPage)
    ├── docs/                MDX + showcase stories rendered in Storybook
    ├── hooks/               Generic React hooks
    ├── lib/                 Utilities (cn, formatters, chart helpers)
    └── providers/           Context providers
```

Each entrypoint barrel (`components.ts`, `primitives.ts`, `patterns.ts`,
`page-templates.ts`) re-exports from its folder.

### Naming

| What                        | Convention   | Example                                                                  |
| --------------------------- | ------------ | ------------------------------------------------------------------------ |
| File names                  | kebab-case   | `dropdown-menu.tsx`                                                      |
| Component identifiers       | PascalCase   | `DropdownMenu`                                                           |
| Hooks, functions, variables | camelCase    | `useFocusTrap`, `formatNumber`                                           |
| Storybook titles            | layer prefix | `Components / Button`, `Patterns / PageHeader`, `Recipes / inputSurface` |

Always forward and merge `className` with `cn(...)`. Use `cva()` for variants.
Utilities live at `@/lib/utils` (not `@/utils`).

A component file exports only components and types, so React Fast Refresh can
hot-update it; ESLint enforces this. Put an exported `cva()` config in a sibling
`<name>-variants.ts`, and exported hooks, contexts or helpers in their own
sibling module, such as `sidebar-context.ts`. These siblings belong to the
component; they aren't Recipes.

### Imports

Consumers import from the layer-specific subpaths, as the Introduction in
Storybook shows. Inside Shade itself, use the `@/` alias for cross-file
imports.

### Stories

Every component ships with `<name>.stories.tsx` next to it:

- `title` follows the layer convention (table above).
- `tags: ['autodocs']` so docs render.
- A short `parameters.docs.description.component`.
- One story per important variant/state, each with a one-line `parameters.docs.description.story` explaining when to use it.

Stories are the gallery. Many small focused stories beat one prose-heavy story.

### ShadCN

Most new components start from a ShadCN install:

```bash
pnpm dlx shadcn@latest add <component-name>
```

Guardrails:

- **Never overwrite an existing Shade component** when the CLI prompts. Choose "No".
- Run on a fresh branch so the CLI's diff is clean.
- If the component already exists, generate into a scratch repo and port the parts you actually want.
- After integrating: replace any raw colour/spacing with semantic tokens; ensure default / hover / focus-visible / disabled all work; trim props that hint at a specific surface.

### Tokens and dark mode

- Reference semantic tokens (`bg-background`, `text-foreground`, `border-border-default`, `--surface-elevated`). Never hard-code hex values.
- Don't write `dark:` variants for colour — semantic tokens flip automatically. Exceptions: assets like logos and illustrations.
- New tokens go in `apps/shade/theme-variables.css` (semantic) or `apps/shade/tailwind.theme.css` (raw `@theme`). Don't introduce ad-hoc CSS variables in component files.

### Common anti-patterns

- Don't import from the root `@tryghost/shade` barrel. Use the layer-specific
  subpaths.
- Don't import Shade's stylesheet or add another `ShadeApp` wrapper in an
  embedded Admin app. Admin owns both centrally.
- Don't use raw colours or colour `dark:` variants. Use semantic tokens.
- Don't add product-specific props or application state to a generic component
  or pattern.
- Don't add a component without its sibling story and required interactive
  states.
- Don't let the ShadCN CLI overwrite an existing Shade component.
- Don't add something to Shade before it has demonstrated reuse. See
  [When to add to Shade at all](#when-to-add-to-shade-at-all).

### Acceptance checklist

Before merging a component:

- [ ] Lives in the right layer (see [Layers](#layers))
- [ ] `className` forwarded and merged with `cn()`
- [ ] All states work: default, hover, focus-visible, disabled
- [ ] Semantic tokens only; no hex values, no `bg-gray-200`-style raw utilities for UI chrome
- [ ] Story covers variants + states with one-line "when to use" descriptions
- [ ] No product-specific props on a generic control
- [ ] `pnpm lint`, `pnpm test`, and Storybook all clean

## Test

- `pnpm test` — type-checks and runs Vitest with coverage
- `pnpm test:unit` — runs Vitest
- `pnpm test:types` — TypeScript only
- `pnpm lint` — ESLint for `src/`, `scripts/` and `test/`

Shade uses Vitest, Testing Library, and jsdom. Unit tests live under
`test/unit/`; use `test/unit/utils/test-utils.tsx` when a test needs the shared
render wrapper.

For a new UI component, make the Storybook stories cover its important
variants and states. Add focused unit tests when they provide useful coverage
for hooks, utilities, or logic-heavy behaviour. Shade does not currently
enforce a package-specific coverage threshold.

## Commits and pull requests

Follow the repository's [contribution workflow](../../docs/contributing/workflow.md)
for commits and pull requests. For Shade UI changes, also include screenshots
or a GIF and update or add the relevant stories.

## Publishing

Shade is on the continuous publish lane as a `prerelease` entry in
[`tools/scripts/release/publish-manifest.json`](../../tools/scripts/release/publish-manifest.json).
When a merge to `main` changes what Shade ships, CI publishes the next
`0.1.0-alpha.N` under npm's `alpha` tag. The committed version selects the alpha
series and npm holds the counter, so no release commits or Git tags are created.
See [Shipping](../../docs/contributing/shipping.md#continuous-lane) for the
release gates and the unchanged-package check.
