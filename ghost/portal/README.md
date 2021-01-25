# Portal

[![CI Status](https://github.com/TryGhost/portal/workflows/Test/badge.svg?branch=master)](https://github.com/TryGhost/portal/actions)
[![npm version](https://badge.fury.io/js/%40tryghost%2Fportal.svg)](https://badge.fury.io/js/%40tryghost%2Fportal)

Drop-in script to make the bulk of Ghost membership features work on any theme.

## Usage

Portal can be enabled on any theme directly by adding the below script in your theme's `default.hbs` just before the end of body tag OR in the code injection footer in Ghost Admin.

```html
<script defer src="https://unpkg.com/@tryghost/portal@latest/umd/portal.min.js" data-ghost="https://mymemberssite.com"></script>
```

The `data-ghost` attribute expects the URL for your site which is the only input Portal needs to work with your site's membership data via Ghost APIs.

Alternatively, Ghost automatically injects this Portal script to any site behind a dedicated flag(see below) which can be added via config, which also enables Site owner/admins to customize specific Portal settings from Ghost-Admin.

NOTE: Since this is currently under active development, Portal can be switched on with a new dedicated flag - `portal` - in [Ghost config](https://ghost.org/docs/concepts/config/), which needs to be added to config file before starting the server.

```json
{
    ...,
    "portal": true
}
```

### Custom trigger button

By default, the script adds a default floating trigger button on the bottom right of your page which is used to trigger the popup on screen.

Its possible to add custom trigger button of your own by adding data attribute `data-portal` to any HTML tag on page, and also specify a specfic [page](https://github.com/TryGhost/Portal/blob/master/src/pages.js#L13-L22) to open from it by using it as `data-portal=signup`.

The script also adds custom class names to this element for open and close state of popup - `gh-portal-open` and `gh-portal-close`, allowing devs to update its UI based on popup state.

## Basic Setup

1. Clone this repository:

```shell
git@github.com:TryGhost/portal.git
```

2. Change into the new directory and install the dependencies:

```shell
cd portal
yarn
```

## Configure for local development

Only useful for active UI development without publishing a version on unpkg. Always use the unpkg link for testing latest released portal script.

#### In this repo(Portal):

- Run `yarn build` to create the minified bundle with your changes at `umd/portal.min.js`

#### In your theme(Ex. Lyra):

- Copy `portal.min.js` from above and paste it in your theme at `assets/built/portal.min.js`
- Add below code in your theme's `default.hbs` just before end of body tag

```html
<script src='{{asset "built/portal.min.js"}}'></script>
```

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

## Learn More

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

# Copyright & License

Copyright (c) 2013-2021 Ghost Foundation - Released under the [MIT license](LICENSE).
