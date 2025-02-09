# Comments UI

Comments widget that is embedded at the bottom of posts in Ghost.

## Development

### Pre-requisites

- Run `yarn` in Ghost monorepo root

### Running via Ghost `yarn dev` in root folder

You can automatically start the comments dev server when developing Ghost by running Ghost (in root folder) via `yarn dev --all` or `yarn dev --comments`. This will host the comments JavaScript files, and makes sure that Ghost uses these locally hosted assets instead of the ones from the CDN.

## Release

A patch release can be rolled out instantly in production, whereas a minor/major release requires the Ghost monorepo to be updated and released. In either case, you need sufficient permissions to release `@tryghost` packages on NPM.

### Patch release

1. Run `yarn ship` and select a patch version when prompted
2. (Optional) Clear JsDelivr cache to get the new version out instantly ([docs](https://www.notion.so/ghost/How-to-clear-jsDelivr-CDN-cache-2930bdbac02946eca07ac23ab3199bfa?pvs=4)). Typically, you'll need to open `https://purge.jsdelivr.net/ghost/comments-ui@~${COMMENTS_UI_VERSION}/umd/comments-ui.min.js` and
`https://purge.jsdelivr.net/ghost/comments-ui@~${COMMENTS_UI_VERSION}/umd/main.css` in your browser, where `COMMENTS_UI_VERSION` is the latest minor version in `ghost/core/core/shared/config/defaults.json` ([code](https://github.com/TryGhost/Ghost/blob/0aef3d3beeebcd79a4bfd3ad27e0ac67554b5744/ghost/core/core/shared/config/defaults.json#L198))

### Minor / major release

1. Run `yarn ship` and select a minor or major version when prompted
2. Update the Comments UI version in `ghost/core/core/shared/config/defaults.json` to the new minor or major version ([code](https://github.com/TryGhost/Ghost/blob/0aef3d3beeebcd79a4bfd3ad27e0ac67554b5744/ghost/core/core/shared/config/defaults.json#L198))
3. Wait until a new version of Ghost is released

# Copyright & License

Copyright (c) 2013-2025 Ghost Foundation - Released under the [MIT license](LICENSE).
