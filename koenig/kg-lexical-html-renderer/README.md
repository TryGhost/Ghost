# Koenig Lexical Html Renderer

Renders a serialized Lexical editor state to an HTML string.

This library differs from Lexical's own [lexical-html](https://github.com/facebook/lexical/tree/main/packages/lexical-html) package in a few ways:

1. its output target is not an editor but rendered web pages or emails, which means the handling of nodes (especially custom DecoratorNodes) will differ from the node's built-in editor-focused rendering
2. render output will vary based on supplied options and targets, e.g. when rendering for email the output may use `<table>` elements in place of modern HTML structure
3. its primary usage environment is server-side

## Install

`npm install @tryghost/kg-lexical-html-renderer`

## Usage

Basic usage:

```js
const {LexicalHTMLRenderer} = require('@tryghost/kg-lexical-html-renderer');
const renderer = new LexicalHTMLRenderer();

const lexicalState = '{...}';
const html = await renderer.render(lexicalState);
```

`render()` is async and returns a string.

Options can be passed in as the second argument to `.render()`.

```js
const html = await renderer.render(lexicalState, {target: 'email'});
```

| Option   | Values |
| -------- | ------ |
| `target` | `'html'` (default), `'email'` |

Options are passed through to each node's renderer in `kg-default-nodes`,
which accepts further keys — `siteUrl`, `postUrl`, `imageOptimization` and
others — for URL resolution and image handling.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-lexical-html-renderer`.

`ghost/core` resolves this package via a `source` export condition pointing at
`src/`, so a change here is picked up by a running Ghost dev server without a
rebuild. Run `pnpm dev` for a watching `tsc` build when you need the compiled
output.

Changes usually need to be made alongside
[kg-default-nodes](../kg-default-nodes), which owns the per-node rendering this
package drives.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
