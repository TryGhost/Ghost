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

## Develop

Run Portal within the Ghost monorepo with:
```
yarn dev --portal
```

Alternatively, use  `yarn dev --all` to load Portal and other supported apps/services, see [dev.js](https://github.com/TryGhost/Ghost/blob/main/.github/scripts/dev.js) for more information.

---

To run Portal in a standalone fashion, use `yarn start` and open [http://localhost:3000](http://localhost:3000).

## Build

To create a production minified bundle in `umd/portal.min.js`:
```
yarn build
```

## Test

To run tests in watch mode:
```
yarn test
```

## Release

A patch release can be rolled out instantly in production, whereas a minor/major release requires the Ghost monorepo to be updated and released. In either case, you need sufficient permissions to release `@tryghost` packages on NPM.

### Patch release

1. Run `yarn ship` and select a patch version when prompted
2. (Optional) Clear JsDelivr cache to get the new version out instantly ([docs](https://www.notion.so/ghost/How-to-clear-jsDelivr-CDN-cache-2930bdbac02946eca07ac23ab3199bfa?pvs=4)). Typically, you'll need to open `https://purge.jsdelivr.net/ghost/portal@~${PORTAL_VERSION}/umd/portal.min.js` and
`https://purge.jsdelivr.net/ghost/portal@~${PORTAL_VERSION}/umd/main.css` in your browser, where `PORTAL_VERSION` is the latest minor version in `ghost/core/core/shared/config/defaults.json` ([code](https://github.com/TryGhost/Ghost/blob/0aef3d3beeebcd79a4bfd3ad27e0ac67554b5744/ghost/core/core/shared/config/defaults.json#L185))

### Minor / major release

1. Run `yarn ship` and select a minor or major version when prompted
2. Update the Portal version in `ghost/core/core/shared/config/defaults.json` to the new minor or major version ([code](https://github.com/TryGhost/Ghost/blob/0aef3d3beeebcd79a4bfd3ad27e0ac67554b5744/ghost/core/core/shared/config/defaults.json#L198))
3. Wait until a new version of Ghost is released

# Copyright & License

Copyright (c) 2013-2024 Ghost Foundation - Released under the [MIT license](LICENSE).
