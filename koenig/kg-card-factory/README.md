# Koenig Card Factory

Card definition factory for Ghost's Mobiledoc renderer.

> Legacy: this package supports posts that have never been converted from
> Mobiledoc. New editor work belongs in the Lexical packages.

## Install

`npm install @tryghost/kg-card-factory`

## Usage

```js
import {CardFactory} from '@tryghost/kg-card-factory';

const factory = new CardFactory({siteUrl: 'https://example.com'});
const card = factory.createCard(cardDefinition);
```

Options passed to the factory are merged into the render options of every card
it creates, with per-render options taking precedence.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-card-factory`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
