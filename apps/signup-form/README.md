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

Vite by default only supports HRM with an ESM output. But when loading a script on a site as a ESM module (`<script type="module" src="...">`), you don't have access to `document.currentScript` inside the script, which is required to determine the location to inject the iframe. In development mode we use a workaround for this to make the ESM HMR work. But this workaroudn is not suitable for production.

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
