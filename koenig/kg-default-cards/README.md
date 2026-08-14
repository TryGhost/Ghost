# Koenig Default Cards

Mobiledoc card definitions for Ghost's editor.

> Legacy: this package supports posts that have never been converted from
> Mobiledoc. New editor work belongs in the Lexical packages.

## Install

`npm install @tryghost/kg-default-cards`

## Usage

```js
import {cards} from '@tryghost/kg-default-cards';

cards.map(card => card.name);
// ['bookmark', 'code', 'email', 'email-cta', 'embed', ...]
```

Each card exposes `name`, `type` and a `render` function, ready to hand to the
Mobiledoc renderer. Cards that contain URLs also expose the relevant transform
helpers (`absoluteToRelative`, `relativeToAbsolute`, `toTransformReady`) that
Ghost applies when storing and serving content.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-default-cards`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
