# Members.js

[![CI Status](https://github.com/TryGhost/members.js/workflows/Test/badge.svg?branch=master)](https://github.com/TryGhost/members.js/actions)
[![npm version](https://badge.fury.io/js/%40tryghost%2Fmembers-js.svg)](https://badge.fury.io/js/%40tryghost%2Fmembers-js)

Drop-in script to make the bulk of Ghost membership features work on any theme.

## Usage

Add below script in your theme's `default.hbs` just before the end of body tag OR in the code injection footer in Ghost Admin.

```html
<script defer src="https://unpkg.com/@tryghost/members-js@latest/umd/members.min.js" data-ghost="https://mymemberssite.com"></script>
```

The `data-ghost` attribute expects the URL for your site which is the only input Portal needs to work with your site's membership data via Ghost APIs.

NOTE: This is currently under active development and available only behind developer experiments flag - `enableDeveloperExperiments` in Ghost, which needs to be added to config file before starting the server.

### Custom trigger button

By default, the script adds a default floating trigger button on the bottom right of your page which is used to trigger the popup on screen.

Its possible to override the default trigger button with your own by adding data attribute `data-portal` to any HTML tag on page, which will hide the default trigger and allow controlling the popup state by clicking on this element.

The script also adds custom class names to this element for open and close state of popup - `gh-members-popup-open` and `gh-members-popup-close`, allowing devs to update its UI based on popup state.

## Basic Setup

1. Clone this repository:

```shell
git@github.com:TryGhost/members.js.git
```

2. Change into the new directory and install the dependencies:

```shell
cd members.js
yarn
```

## Configure for local development

Only useful for active UI development without publishing a version on unpkg. Always use the unpkg link for testing latest released members.js.

#### In this repo(Members.js):

- Run `yarn build` to create the minified bundle with your changes at `umd/members.min.js`

#### In your theme(Ex. Lyra):

- Copy `members.min.js` from above and paste it in your theme at `assets/built/members.min.js`
- Add below code in your theme's `default.hbs` just before end of body tag

```html
<script src="{{asset "built/members.min.js"}}"></script>
```

## Available Scripts

In the project directory, you can also run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn build`

Creates the production single minified bundle for external use in `umd/members.min.js`.  <br />

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.


## Publish

Run `yarn ship` to publish new version of script.

`yarn ship` is an alias for `npm publish`

- Builds the script with latest code using `yarn build` (prePublish)
- Publishes package on npm as `@tryghost/members-js` and creates an unpkg link for script at https://unpkg.com/@tryghost/members-js@VERSION

## Learn More

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

# Copyright & License

Copyright (c) 2020 Ghost Foundation - Released under the [MIT license](LICENSE).