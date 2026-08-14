# Koenig

Koenig is Ghost's post editor. This directory contains the editor UI and its
supporting packages, merged into the Ghost monorepo from the former
[TryGhost/Koenig](https://github.com/TryGhost/Koenig) repo with full git
history.

Everything here resolves via `workspace:` specs — nothing in dev, CI, or the
release archive installs these packages from npm. The npm-published versions
exist for external consumers only (see [Shipping](#shipping)).

## Packages

### Editor UI

| Package | What it is | Consumed by |
| --- | --- | --- |
| [koenig-lexical](./koenig-lexical) | The Lexical-based rich text editor (React). Ships as a UMD bundle with styles and SVGs inlined | `ghost/admin` (bundled into admin assets at build time), `apps/admin`, `apps/admin-x-framework` |
| [kg-simplemde](./kg-simplemde) | Customised fork of SimpleMDE, used by koenig-lexical's markdown card | `koenig-lexical` |
| [kg-unsplash-selector](./kg-unsplash-selector) | React Unsplash image picker | `koenig-lexical`, `apps/admin`, `apps/admin-x-settings` |

### Lexical node definitions & rendering

These are plain TypeScript Node libraries. `kg-default-nodes` is the single
source of truth for node rendering — both the editor and the server render
through it.

| Package | What it is | Consumed by |
| --- | --- | --- |
| [kg-default-nodes](./kg-default-nodes) | Lexical node definitions for all of Ghost's cards, including each node's HTML renderer. Must stay browser-safe (it runs in the editor as well as on the server) | `ghost/core`, `koenig-lexical`, most other kg-* packages |
| [kg-default-transforms](./kg-default-transforms) | Lexical node transforms (denesting, blockquote children, etc.) shared between editor and server | `koenig-lexical`, `kg-lexical-html-renderer`, `kg-html-to-lexical` |
| [kg-lexical-html-renderer](./kg-lexical-html-renderer) | Renders a serialized Lexical state to front-end/email HTML server-side (not editor DOM — output differs per target, e.g. `<table>` markup for email) | `ghost/core` |
| [kg-html-to-lexical](./kg-html-to-lexical) | Converts HTML strings into Lexical editor state (imports, API `?source=html`) | `ghost/core` |
| [kg-converters](./kg-converters) | Converts between serialized Mobiledoc and Lexical formats | `ghost/core`, `ghost/admin` |

### Shared helpers

| Package | What it is | Consumed by |
| --- | --- | --- |
| [kg-clean-basic-html](./kg-clean-basic-html) | Sanitises/normalises snippets of "basic HTML" (card captions etc.) | `ghost/core`, `ghost/admin`, `kg-default-nodes` |
| [kg-markdown-html-renderer](./kg-markdown-html-renderer) | Markdown → HTML rendering for the markdown card | `ghost/core`, `kg-default-nodes`, `kg-default-cards` |
| [kg-utils](./kg-utils) | Small shared utilities (slugify) | `kg-default-cards`, `kg-lexical-html-renderer`, `kg-markdown-html-renderer` |

### Legacy (Mobiledoc era)

Still consumed by `ghost/core` to render posts that have never been converted
from Mobiledoc. Avoid new work here.

| Package | What it is | Consumed by |
| --- | --- | --- |
| [kg-card-factory](./kg-card-factory) | Card definition factory for the Mobiledoc renderer | `ghost/core` |
| [kg-default-cards](./kg-default-cards) | Mobiledoc card definitions | `ghost/core` |

## Development

There is no linking or per-package install step — run `pnpm setup` once from
the monorepo root and everything resolves through the workspace.

### Working on the editor (koenig-lexical)

Two modes:

- **Standalone** — `pnpm dev` inside `koenig/koenig-lexical` starts a demo app
  on http://localhost:5173 with all features enabled. Fastest feedback loop;
  no Ghost required.
- **Integrated** — `pnpm dev:lexical` from the monorepo root starts the full
  Ghost dev environment plus a rebuild watcher for the editor (and
  kg-default-nodes / kg-default-transforms) with a preview server on port
  4173. Ghost Admin at http://localhost:2368/ghost loads your local editor
  build; changes appear after the few seconds it takes to rebuild.

See [koenig-lexical/README.md](./koenig-lexical/README.md) for card-specific
setup (Klipy API key for the gif card, CORS notes for bookmark/embed cards)
and styling conventions.

### Working on the kg-* Node libraries

The libraries consumed by `ghost/core` declare a `source` export condition
pointing at their raw `src/*.ts`, listed before the compiled `build/` entries.
`ghost/core`'s dev runner and Vitest configs activate that condition, so a
source change in a kg-* package is picked up by a running Ghost dev server and
by core's tests with **no `tsc` rebuild**. Production and the published npm
tarballs ignore `source` and use `build/`.

You only need `pnpm build` (Nx handles the dependency order) for
type-checking, the browser lanes, and production artifacts — not for the
edit/run/test loop against ghost/core.

### Testing

- kg-* Node libraries share a Vitest base config —
  [vitest.shared.ts](./vitest.shared.ts) (`createKoenigVitestConfig`). Run
  `pnpm test:unit` in the package, or `pnpm test` for the full gate (types +
  coverage thresholds + lint).
- `koenig-lexical` has Vitest unit tests and a large Playwright acceptance
  suite: `pnpm test:unit`, `pnpm test:acceptance` (headless by default;
  `:headed`, `:report`, and `test:slowmo` variants for debugging). See
  [koenig-lexical/CLAUDE.md](./koenig-lexical/CLAUDE.md).
- `kg-unsplash-selector` also has a Playwright suite (`pnpm test:acceptance`).

## Shipping

Ghost itself never installs these packages from npm:

- **Dev and CI** resolve them from the workspace (`workspace:~`).
- **Ghost Admin** bundles the editor at build time:
  `ghost/admin/lib/asset-delivery` copies `koenig-lexical`'s UMD build into
  the admin assets, served at `/ghost/assets/koenig-lexical/`.
- **The release archive** embeds the kg-* packages as component tarballs —
  `ghost/core/scripts/pack.js` discovers them transitively from ghost/core's
  dependencies and packs each one, so a deployed Ghost installs exactly the
  versions it was built with. `src/` is excluded from each package's `files`
  array, so raw source is never shipped.

### npm publishing (external consumers)

The `publish_koenig_packages` job in
[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs on stable release
tags only (no `-rc` prereleases), after `publish_ghost` succeeds — so every
published version corresponds to content that shipped inside a released Ghost.
It runs [scripts/publish-koenig-packages.cjs](../scripts/publish-koenig-packages.cjs),
which for each non-private package:

1. Skips it if its directory is unchanged since the previous release tag.
2. Computes the next version: `package.json` pins the **major.minor** line,
   npm is the source of truth for the **patch**. To cut a new minor/major,
   bump it in `package.json`; never bump the patch by hand.
3. Builds via Nx and publishes, in dependency order, so `workspace:~` specs
   are rewritten to the versions published in the same run.

For urgent out-of-band publishes there's a `workflow_dispatch` escape hatch
(`publish-koenig-package.yml`) that publishes a single named package from the
current checkout, skipping change detection.
