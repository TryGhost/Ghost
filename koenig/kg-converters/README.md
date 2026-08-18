# Koenig Converters

Converts between the serialized Mobiledoc and Lexical formats.

## Install

`npm install @tryghost/kg-converters`

## Usage

```js
import {mobiledocToLexical, lexicalToMobiledoc} from '@tryghost/kg-converters';

const lexical = mobiledocToLexical(serializedMobiledoc);
const mobiledoc = lexicalToMobiledoc(serializedLexical);
```

Both take and return serialized JSON strings. Mobiledoc cards are carried
across as Lexical nodes of the same name, so a round trip preserves cards that
both formats know about.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-converters`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
