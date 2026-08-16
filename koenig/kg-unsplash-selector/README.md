# Unsplash Selector

React Unsplash image picker used by Ghost's Koenig editor and Admin.

## Install

`npm install @tryghost/kg-unsplash-selector`

## Usage

```jsx
import {UnsplashSearchModal} from '@tryghost/kg-unsplash-selector';

<UnsplashSearchModal
    unsplashProviderConfig={unsplashConfig}
    onClose={() => setOpen(false)}
    onImageInsert={image => insert(image)}
/>
```

Passing `null` as `unsplashProviderConfig` swaps in an in-memory provider that
serves fixtures instead of calling the Unsplash API, which is what the
standalone dev server uses.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-unsplash-selector`.

Run `pnpm dev` to start a standalone development server, which renders the
picker from `index.html` at http://localhost:5173. To develop without making
requests to the Unsplash API, run `VITE_APP_TESTING=true pnpm dev` to serve
in-memory fixtures instead.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test:acceptance` runs the Playwright acceptance tests
- `pnpm test:acceptance <path>` runs a single acceptance test
- `pnpm test:acceptance:slowmo` runs them headed and slowed down, for debugging
- `pnpm test:acceptance:full` runs them against all configured browsers
- `pnpm test` runs unit and acceptance tests

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
