# Koenig Clean Basic Html

Sanitises and normalises the basic HTML snippets used in Ghost's editor cards, such as captions.

## Install

`npm install @tryghost/kg-clean-basic-html`

## Usage

```js
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';

cleanBasicHtml('  <p>Hello <b>world</b></p>&nbsp; ');
// '<p>Hello <b>world</b></p>'
```

In the browser the document is taken from the global `document`. In Node you
must supply one, or the call throws:

```js
import {JSDOM} from 'jsdom';

cleanBasicHtml(html, {
    createDocument: htmlString => new JSDOM(htmlString).window.document
});
```

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-clean-basic-html`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
