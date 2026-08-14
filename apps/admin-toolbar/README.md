# Admin Toolbar

Frontend staff toolbar for Ghost sites. It uses Preact to keep the public-facing
bundle small while providing the rendering and hooks the toolbar needs.

## Development

Run `pnpm dev:public` from the monorepo root to start the standard development
environment and the Admin Toolbar watcher. To work on this package by itself,
run these commands from this directory:

```bash
pnpm build    # one-off build (main bundle + edit-mode chunk)
pnpm dev      # watch and rebuild umd/admin-toolbar.min.js
pnpm test     # build + run tests against the built bundles
```

## Edit mode chunk

The toolbar ships in three bundles:

- `umd/admin-toolbar.min.js` — the main IIFE, loaded on every page view for
  signed-in staff. Built by `vite.config.mjs`.
- `umd/admin-toolbar-editor.min.js` — the edit-mode chunk, a plain ES module
  built from `src/edit-mode/index.js` by `vite.editor.config.mjs`. It is only
  fetched when a user with theme permissions clicks "Edit" on a site with the
  `editModeOnSite` labs flag enabled. It bundles `@tryghost/theme-renderer`
  (both for the main-thread render fallback and the editor tooling), so it is
  large by design — which is exactly why it is lazy-loaded.
- `umd/admin-toolbar-editor-worker.min.js` — the render-worker entry, a plain
  ES module built from `src/edit-mode/worker.js` by `vite.worker.config.mjs`.
  The chunk boots it as a module Web Worker via a blob bootstrap
  (`src/edit-mode/render-client.js`) and falls back to rendering on the main
  thread when workers are unavailable (CSP etc.).

The main bundle must never statically import anything under `src/edit-mode/`
except `loader.js` — the build inlines dynamic imports
(`inlineDynamicImports`), so the chunk boundary is a *runtime* URL: `loader.js`
resolves `admin-toolbar-editor.min.js` relative to the toolbar script's own
`src` and loads it with a native `import()`. The chunk resolves the worker
artifact the same way. The test suite asserts a sentinel string from the chunk
stays out of the main bundle, and guards the main bundle's size.

Edit-mode internals live in `src/edit-mode/`: `session.js` (orchestration),
`render-client.js`/`render-backend.js`/`worker.js` (worker-first rendering),
`swap.js` (in-place document swap), `draft-store.js` (the DraftStore seam,
in-memory only for now), `theme-api.js` (Admin API download/upload), and
`ui.js`/`interactions.js` (Preact overlay + click-to-edit). Building the chunk
requires `@tryghost/theme-renderer`'s `build/` output (nx orders this via the
workspace dependency).

`pnpm build` builds all three (main first — it empties `umd/`). During
development:

```bash
pnpm dev           # terminal 1: watch the main bundle
pnpm dev:editor    # terminal 2 (only for edit-mode work): watch the chunk
pnpm dev:worker    # terminal 3 (only for edit-mode work): watch the worker
```

Start `pnpm dev` before the others — the main watcher empties `umd/` once on
startup. The nx `dev` target runs the main watcher, matching the pre-existing
behaviour; `pnpm build:editor` / `pnpm build:worker` do one-off builds if you
don't need the watchers.

## How it's served

In production, the script is loaded from jsDelivr via the `adminToolbar` config
in `defaults.json`, following the same CDN pattern as portal, comments-ui, and
the other public apps. In development, `docker/ghost-dev/Dockerfile` overrides
that URL to `/ghost/assets/admin-toolbar/admin-toolbar.min.js`, which the dev
gateway serves straight off disk from this package's `umd/` directory — so the
watcher's output is picked up on the next request.

## Release

Patch releases are automatic. When Admin Toolbar changes on `main`, CI publishes
the next patch version to npm and clears the jsDelivr cache. Sites using that
major/minor line receive the patch without a Ghost release.

For an intentional minor or major release:

1. From a clean branch, run `pnpm ship` and select a minor or major version
2. Merge the release commit to `main`
3. Wait for a public Ghost release to ship the new default version line

`pnpm ship` updates both the package version and Ghost's default Admin Toolbar
version.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
