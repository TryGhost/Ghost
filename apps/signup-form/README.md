# Embeddable Signup Form

Embed a Ghost signup form on any site.

## Development

### Pre-requisites

- Run `yarn` in Ghost monorepo root
- Run `yarn` in this directory

### Running via Ghost `yarn dev` in root folder

You can automatically start the signup-form dev server when developing Ghost by running Ghost (in root folder) via `yarn dev --all`. This will only build the production build, without the demo site.

Running via `yarn dev --all --signup` or `yarn dev --signup` will also serve the demo site on `http://localhost:6173`.

### Running the development version only

Run `yarn dev` (in package folder) to start the development server to test/develop the form standalone. 
- This will generate a demo site on http://localhost:6173
- This will build and watch the production build and host it on http://localhost:6174/signup-form.min.js (different port!)

### Using the UMD build during development

Vite by default only supports HRM with an ESM output. But when loading a script on a site as a ESM module (`<script type="module" src="...">`), you don't have access to `document.currentScript` inside the script, which is required to determine the location to inject the iframe. In development mode we use a workaround for this to make the ESM HMR work. But this workaround is not suitable for production.

To test the real production behaviour without this hack, you can use http://localhost:6173/preview.html. This HTML page will use `http://localhost:6174/signup-form.min.js` directly. 

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.

## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests
- `yarn test:e2e` run e2e tests on Chromium
- `yarn test:slowmo` run e2e tests visually (headed) and slower on Chromium
- `yarn test:e2e:full` run e2e tests on all browsers

## Release

A patch release can be rolled out instantly in production, whereas a minor/major release requires the Ghost monorepo to be updated and released.
In either case, you need sufficient permissions to release `@tryghost` packages on NPM.

### Patch release

1. Run `yarn ship` and select a patch version when prompted
2. Merge the release commit to `main`

### Minor / major release

1. Run `yarn ship` and select a minor or major version when prompted
2. Merge the release commit to `main`
3. Wait until a new version of Ghost is released

To use the new version of signup form in Ghost, update the version in Ghost core's default configuration (currently at `core/shared/config/default.json`)
