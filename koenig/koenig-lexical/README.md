# React module package

This is a package set up to build a library module containing React components/libraries for use in external apps. Build and development environment provided via [Vite](https://vitejs.dev);

## Development

Run `yarn dev` to start the development server. This will generate a demo site from the `index.html` file which renders the demo app in `demo/demo.jsx` and makes it available on http://localhost:5173

### Project structure

**`/src`**

The main module source. `/src/index.js` is the entry point for the exposed module and should export everything needed to use the module from an external app.

**`/demo`**

Used for developing the module. Should import from the module `import {Foo} from '../src'` and render the components in a way that facilitates development and manual testing.

### Set up details

**CSS**

Everything is set up ready for using Tailwind to style the module's components. Top-level components that require styling should have an `import 'styles/index.css';` statement at the top of the file which will inject a `<style>` element to the consuming app's `<head>` with all of the Tailwind CSS used by the module.

All styles are scoped under the project name to avoid clashes and keep styling as isolated as possible, e.g. `.module-name .utility`. PostCSS nesting support is present to make this easier.

- Styles located in `src/styles/` are included in the final built module.
- Styles located in `demo/*.css` are only used in the demo and will not be included in the built module.

When packaging the module, styles are included inside the JS file rather than being separate to allow for a single import of the module in the consuming app.

**SVGs**

SVGs can be imported as React components in the [same way as create-react-app](https://create-react-app.dev/docs/adding-images-fonts-and-files/#adding-svgs). Typically files are stored in `src/assets/`.

All imported files are processed/optimised via SVGO (see `svgo.config.js` for optimisation config) and included in the built JS file.
