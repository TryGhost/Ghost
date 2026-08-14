# Koenig Utils

Small shared utilities used across the Koenig packages.

## Install

`npm install @tryghost/kg-utils`

## Usage

```js
import {slugify} from '@tryghost/kg-utils';

slugify('My Post Title!');
// 'my-post-title'
```

`slugify` accepts `{ghostVersion, type}`, both of which select a slug format
rather than changing the input. `ghostVersion` defaults to `'4.0'`; passing an
earlier version reproduces the pre-4.0 format, which older content's anchor
links depend on:

```js
slugify('Ünïcödé Tïtlé');
// '%C3%BCn%C3%AFc%C3%B6d%C3%A9-t%C3%AFtl%C3%A9'

slugify('Ünïcödé Tïtlé', {ghostVersion: '3.0'});
// '-n-c-d-t-tl-'
```

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-utils`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
