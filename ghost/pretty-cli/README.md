# Pretty CLI

A mini-module to style a [sywac](http://sywac.io/) instance in a standard way

## Install

Either: `npm install @tryghost/pretty-cli --save`

Or: `yarn add @tryghost/pretty-cli`

## Usage

E.g. `const prettyCLI = require('@tryghost/pretty-cli');`

`prettyCLI` is a pre-styled instance of the [sywac](http://sywac.io/) API.

See the [sywac quickstart](http://sywac.io/docs/) and [config guide](http://sywac.io/docs/sync-config.html) for full usage.

Example:

```
#!/usr/bin/env node
const prettyCLI = require('@tryghost/pretty-cli');


prettyCLI
  .command({
    flags: 'myTask [option]',
    desc: 'Run myTask',
    run: (argv) =>  { ... do something here }
  })
  .parseAndExit();
```

Pretty CLI also provides a common UI interface, providing log functions to output coloured messages to the UI:

```
const ui = require('@tryghost/pretty-cli/ui');`

ui.log.info('Done');
ui.log.warn('Uh Oh', 'Something went wrong');
```

You can also grab a fresh instance of the api with `prettyCLI.Api.get()`.

The style rules used are available at `prettyCLI.styles`.

## Test

- `yarn lint` run just eslint
- `yarn test` run lint && tests

# Copyright & License

Copyright (c) 2013-2021 Ghost Foundation - Released under the [MIT license](LICENSE).
