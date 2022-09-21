# Koenig - Lexical edition

Early stage re-write of Ghost's editor, using Lexical as the editor framework in place of mobiledoc-kit.

## Development

Run `yarn dev` to start the development server to test/develop the editor standalone. This will generate a demo site from the `index.html` file which renders the demo app in `demo/demo.jsx` and makes it available on http://localhost:5173

To test/develop inside of Admin you can run `yarn preview` then in Ghost set your `editor.url` value in `config.local.json` to `http://127.0.0.1:4173/koenig-lexical.umd.js` and load Admin as usual.

```json
{
    ...
    "editor": {
        "url": "http://127.0.0.1:4173/koenig-lexical.umd.js"
    }
}
```

`yarn preview` by itself only serves the library files, it's possible ro run `yarn build --watch` in a separate terminal tab to have auto-rebuild whilst developing.

### Project structure

**`/src`**

The main module source. `/src/index.js` is the entry point for the exposed module and should export everything needed to use the module from an external app.

**`/demo`**

Used for developing/demoing the editor. Renders a blank editor with all features enabled.

### Set up details

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

Tests use [Vitest](https://vitest.dev) as the test runner, with [Puppeteer](https://pptr.dev) used for e2e testing.

- `yarn test run` runs tests and exits
- `yarn test:watch` runs tests and starts a test watcher that re-runs tests on file changes
- `yarn test:watch --ui` same as `yarn test:watch` but also opens a browser UI for exploring and re-running tests

Before tests are started we build a version of the demo app that is used for e2e tests. Config for that is located in `vite.config.test.js` and should mostly mirror the main config file in `vite.config.js` except for building a full site rather than a UMD library file.

### Editor integration

There's a [vitest vscode extension](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) that lets you run and debug individual tests/groups directly inside vscode.
