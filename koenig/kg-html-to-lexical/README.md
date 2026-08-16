# Html To Lexical

Converts HTML strings into Lexical editor state, used by imports and the Admin API's `?source=html` option.

## Install

`npm install @tryghost/kg-html-to-lexical`

## Usage

```js
const {htmlToLexical} = require('@tryghost/kg-html-to-lexical');

const state = htmlToLexical('<p>Hello <strong>world</strong></p>');
// {root: {children: [...], type: 'root', ...}}
```

Returns a serializable editor state object, not a string — `JSON.stringify` it
before storing. Runs headlessly via JSDOM, so it works server-side.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-html-to-lexical`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
