# Koenig Default Nodes

Lexical node definitions for all of Ghost's cards, including each node's HTML renderer. This is the single source of truth for node rendering — both the editor and the server render through it.

## Install

`npm install @tryghost/kg-default-nodes`

## Usage

```js
const {createEditor} = require('lexical');
const {DEFAULT_NODES, DEFAULT_CONFIG} = require('@tryghost/kg-default-nodes');

const editor = createEditor({
    nodes: DEFAULT_NODES,
    html: DEFAULT_CONFIG.html
});
```

`DEFAULT_NODES` covers Ghost's own cards, so pair it with the base Lexical
nodes your content needs. `DEFAULT_CONFIG.html` supplies the import serializers
that keep pasted HTML mapping onto the right nodes.

Individual nodes are exported by name (`ImageNode`, `CalloutNode`, and so on)
when you need a subset rather than the full set.

This package must stay browser-safe: it runs inside the editor as well as on
the server.

## Develop

This package is part of the [Ghost monorepo](https://github.com/TryGhost/Ghost)
and resolves through the pnpm workspace — there is no linking or per-package
install step. Run `pnpm setup` in the monorepo root, then work in
`koenig/kg-default-nodes`.

See the [Koenig README](../README.md) for the shared build, test and release
workflow.

## Test

- `pnpm test:unit` runs the unit tests
- `pnpm test` runs the unit and type tests, including coverage thresholds
- `pnpm lint` runs the lint checks

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
