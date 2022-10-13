# Portal

[![npm version](https://badge.fury.io/js/%40tryghost%2Fportal.svg)](https://badge.fury.io/js/%40tryghost%2Fportal)

[Drop-in script](https://ghost.org/help/setting-up-portal/) to make the bulk of Ghost membership features work on any theme.

## Usage

Ghost automatically injects Portal script on all sites running Ghost 4 or higher.

Alternatively, Portal can be enabled on non-ghost pages directly by inserting the below script on the page.

```html
<script defer src="https://unpkg.com/@tryghost/portal@latest/umd/portal.min.js" data-ghost="https://mymemberssite.com"></script>
```

The `data-ghost` attribute expects the URL for your Ghost site, which is the only input Portal needs to work with your site's membership data via Ghost APIs.

### Custom trigger button

By default, the script adds a default floating trigger button on the bottom right of your page which is used to trigger the popup on screen.

Its possible to add custom trigger button of your own by adding data attribute `data-portal` to any HTML tag on page, and also specify a specific [page](https://github.com/TryGhost/Ghost/blob/main/ghost/portal/src/pages.js#L13-L22) to open from it by using it as `data-portal=signup`.

The script also adds custom class names to this element for open and close state of popup - `gh-portal-open` and `gh-portal-close`, allowing devs to update its UI based on popup state.

Refer the [docs](https://ghost.org/help/setup-members/#customize-portal-settings) to read about ways in which Portal can be customized for your site.

## Basic Setup

This section is mostly relevant for core team only for active Portal development. Always use the unpkg link for testing/using latest released portal script.

- Run `yarn start:dev` to start Portal in development mode
- Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
- To use the local Portal script in a local Ghost site
  - Update `config.local.json` in Ghost repo to add "portal" config pointing to local dev server url as instructed on terminal.
  - By default, this uses port `5368` for loading local Portal script on Ghost site. It's also possible to specify a custom port when running the script using - `--port=xxxx`.

## Available Scripts

In the project directory, you can also run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn build`

Creates the production single minified bundle for external use in `umd/portal.min.js`.  <br />

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.


## Publish

Run `yarn ship` to publish new version of script.

`yarn ship` is an alias for `npm publish`

- Builds the script with latest code using `yarn build` (prePublish)
- Publishes package on npm as `@tryghost/portal` and creates an unpkg link for script at https://unpkg.com/@tryghost/portal@VERSION

(Core team only)

## Learn More

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).
