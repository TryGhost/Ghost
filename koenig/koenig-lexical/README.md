# Koenig - Lexical edition

Ghost editor, based on the Lexical framework.

## Development

The editor can be run in two modes:
- standalone mode: demo version that runs without a dependency on Ghost
- integrated mode: integrated into Ghost Admin

### Standalone mode

Run `yarn dev` to start the editor in standalone mode for development on http://localhost:5173. This command generates a demo site from the `index.html` file, which renders the demo app in `demo/demo.jsx`.

### Integrated mode

In order to run the editor inside Ghost Admin, follow the 3 steps below:

1. Link Koenig server-side dependencies inside Ghost
   - Run `yarn link` inside `Koenig/packages/kg-default-nodes` and `Koenig/packages/kg-lexical-html-renderer`
   - Paste the output at the root of the Ghost monorepo:
     - `yarn link @tryghost/kg-default-nodes`
     - `yarn link @tryghost/kg-lexical-html-renderer`

2. Start Ghost in dev mode: inside the Ghost monorepo, run `yarn dev --lexical`.

3. Start the editor in dev mode: inside the Koenig monorepo, run `yarn dev`.

Now, if you navigate to Ghost Admin at http://localhost:2368/ghost and open a post, it will use your local version of the editor. Changes to the editor will be reflected inside Ghost Admin after a few seconds - the time for the editor to get rebuilt.

### Specific card setup

#### Gif card

To see this card locally, you need to create `.env.local` file in `koenig-lexical` root package with the next data:
```
VITE_TENOR_API_KEY=xxx
```

How to get the tenor key is described here https://ghost.org/docs/config/#tenor

#### Bookmark & Embed cards

These cards make external web requests. Since the demo doesn't have a server to process these requests, we must fetch these resources on the front end. To do this we need to enable CORS, which is most easily done with a browser extension like 'Test CORS' for Chrome. Otherwise you will see blocked requests logging errors in the console. This can also be avoided by using test data directly without fetching via `fetchEmbed.js`.

## Additional notes

### Project structure

**`/src`**

The main module source. `/src/index.js` is the entry point for the exposed module and should export everything needed to use the module from an external app.

**`/demo`**

Used for developing/demoing the editor. Renders a blank editor with all features enabled.

### Styling

**CSS**

Styling should be done using Tailwind classes where possible.

All styles are scoped under `.koenig-lexical` class to avoid clashes and keep styling as isolated as possible. PostCSS nesting support is present to make this easier.

- Styles located in `src/styles/` are included in the final built module.
- Styles located in `demo/*.css` are only used in the demo and will not be included in the built module.

When packaging the module, styles are included inside the JS file rather than being separate to allow for a single import of the module in the consuming app.

**SVGs**

SVGs can be imported as React components in the [same way as create-react-app](https://create-react-app.dev/docs/adding-images-fonts-and-files/#adding-svgs). Typically files are stored in `src/assets/`.

All imported files are processed/optimised via SVGO (see `svgo.config.js` for optimisation config) and included in the built JS file.

## Testing

We use [Vitest](https://vitest.dev) for unit tests and [Playwright](https://playwright.dev) for e2e testing.

- `yarn test` runs all tests and exits
- `yarn test:unit` runs unit tests
- `yarn test:unit:watch` runs unit tests and starts a test watcher that re-runs tests on file changes
- `yarn test:unit:watch --ui` runs unit tests and opens a browser UI for exploring and re-running tests
- `yarn test:e2e` runs e2e tests
- `yarn test:e2e --headed` runs tests in browser so you can watch the tests execute
- `yarn test:slowmo` same as `yarn test:e2e --headed` but adds 100ms delay between instructions to make it easier to see what's happening (note that some tests may fail or timeout due to the added delays)
- `yarn test:e2e --ui` opens a [browser UI](https://playwright.dev/docs/test-ui-mode) in watch mode for exploring and re-running tests
- `yarn test:e2e --ui --headed` same as `yarn test:e2e --ui` but also runs tests in browser so you can watch the tests execute

Before tests are started we build a version of the demo app that is used for the unit tests.

When developing it can be useful to limit unit tests to specific keywords (taken from `describe` or `it/test` names). That's possible using the `-t` param and works with any of the above test commands, e.g.:

- `yarn test:unit:watch -t "buildCardMenu"`

### How to debug e2e tests on CI

You can download the report in case of tests were failed. It can be found in the actions `Summary` in the `Artifacts` section.
To check traces, run command `npx playwright show-trace trace.zip`.
More information about traces can be found here https://playwright.dev/docs/trace-viewer

### ESM in e2e tests

Node enables ECMAScript modules if `type: 'module'` in package.json file. It leads to some restrictions:
- [No require, exports, module.exports, __filename, __dirname](https://github.com/GrosSacASac/node/blob/master/doc/api/esm.md#no-require-exports-moduleexports-__filename-__dirname)
- [Mandatory file extensions](https://github.com/GrosSacASac/node/blob/master/doc/api/esm.md#mandatory-file-extensions)
- [No require.extensions](https://github.com/GrosSacASac/node/blob/master/doc/api/esm.md#no-requireextensions). It means we don't have control over the extensions list. Further will be a description of why this is important.

We can make file extension optional with [--experimental-specifier-resolution](https://nodejs.org/api/cli.html#--experimental-specifier-resolutionmode)
flag, which we use. But node is not recognized `jsx` extension.
It can be solved with [node loaders](https://github.com/nodejs/loaders-test/tree/main/commonjs-extension-resolution-loader), whereas
as they're still in [experimental mode](https://nodejs.org/api/esm.html#esm_experimental_loaders), there is no appropriate
implementation for this use case.
The same issue was raised in the babel repo, but the loader won't be added while node loaders are
in [experimental mode](https://github.com/babel/babel/issues/11934).

We can add our loader implementation to solve the issue. Still, in reality, we shouldn't need real
JSX components in e2e tests. It can be a situation when some constants locate in the `jsx` file. In this case,
we can move them to js file. If it is a problem in the future, we can add our implementation of the loader or
add an extension to all imports in the project.

### Editor integration

There's a [vitest vscode extension](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) that
lets you run and debug individual unit tests/groups directly inside vscode.

## Deployment

Koenig packages are shipped via Lerna at the monorepo level. Please refer to the monorepo's [README](../../README.md) for deployment instructions.
