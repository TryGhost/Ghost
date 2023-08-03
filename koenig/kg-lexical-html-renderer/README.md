# Koenig Lexical Html Renderer

Renders a lexical editor state string to a HTML string.

This library differs from Lexical's own [lexical-html](https://github.com/facebook/lexical/tree/main/packages/lexical-html) package in a few ways:

1. it's output target is not an editor but rendered web pages or emails which means the handling of nodes (especially custom DecoratorNodes) will differ to the node's built-in editor-focused rendering
2. render output will vary based on supplied options and targets, e.g. when rendering for email the output may use `<table>` elements in place of modern HTML structure
3. it's primary usage environment is server-side

## Install

`npm install @tryghost/kg-lexical-html-renderer --save`

or

`yarn add @tryghost/kg-lexical-html-renderer`


## Usage

Basic usage:

```js
const LexicalHTMLRenderer = require('@tryghost/kg-lexical-html-renderer');
const renderer = new Renderer();

const lexicalState = '{...}';
const html = await renderer.render(lexicalState);
```

Options can be passed in as the second argument to `.render()`.

```js
const html = await renderer.render(lexicalState, {target: 'email'});
```

| Option   | Values |
| -------- | ------ |
| `target` | `'html'` (default), `'email'` |

## Develop

This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.


## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests


## Running in Ghost Admin
In order to run local changes, perform the following:
1. Run `yarn link` within `kg-lexical-html-renderer`
2. Run `yarn link @tryghost/kg-lexical-html-renderer` within `ghost/core`

`kg-default-nodes` must also be linked when linking this package as they are codependencies.


# Copyright & License

Copyright (c) 2013-2023 Ghost Foundation - Released under the [MIT license](LICENSE).
