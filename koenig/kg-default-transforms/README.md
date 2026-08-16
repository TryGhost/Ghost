# Koenig Default Transforms

Lexical node transforms shared between the editor and the server, such as denesting and list merging.

## Install

`npm install @tryghost/kg-default-transforms`

## Usage

```js
const {registerDefaultTransforms} = require('@tryghost/kg-default-transforms');

const teardown = registerDefaultTransforms(editor);
```

Returns a teardown function that unregisters every transform it added.

Individual transforms are also exported by name for cases that need a subset.
`registerRemoveAtLinkNodesTransform` is deliberately not part of the defaults —
it is only wanted when rendering.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-default-transforms`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
