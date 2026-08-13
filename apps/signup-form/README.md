# Embeddable Signup Form

Embed a Ghost signup form on any site.

## Development

### Pre-requisites

- Run `pnpm setup` in the Ghost monorepo root

### Running via Ghost from the monorepo root

Start Ghost with the public-app watchers enabled:

```bash
pnpm dev:public
```

This starts the standard development environment and the Signup Form watcher.

### Running the standalone demo page

Run `pnpm dev:standalone` (in this package folder) to start the standalone development server with HMR for testing/developing the form in isolation.
- This serves the demo page at http://localhost:6173

`pnpm dev` on its own (in this package folder) only builds `umd/signup-form.min.js` and watches for changes — it does not bind a port. The UMD is served by Caddy at http://localhost:2368/ghost/assets/signup-form/signup-form.min.js when you run `pnpm dev:public` from the monorepo root.

### Using the UMD build during development

Vite by default only supports HRM with an ESM output. But when loading a script on a site as a ESM module (`<script type="module" src="...">`), you don't have access to `document.currentScript` inside the script, which is required to determine the location to inject the iframe. In development mode we use a workaround for this to make the ESM HMR work. But this workaround is not suitable for production.

To test the real production behaviour without this hack, you can use http://localhost:6173/preview.html (served by `pnpm dev:standalone`). The page loads the production UMD via `<script src="http://localhost:2368/ghost/assets/signup-form/signup-form.min.js">`, which is served by Caddy when `pnpm dev:public` is also running from the monorepo root. Both processes need to be up at the same time.

## Test

- `pnpm lint` run just eslint
- `pnpm test:acceptance` run acceptance tests on Chromium
- `pnpm test:acceptance:slowmo` run acceptance tests visually (headed) and slower on Chromium
- `pnpm test:acceptance:full` run acceptance tests on all configured browsers

## Release

Patch releases are automatic. When Signup Form changes on `main`, CI publishes the next patch version to npm and clears the jsDelivr cache. Sites using that major/minor line receive the patch without a Ghost release.

For an intentional minor or major release:

1. From a clean branch, run `pnpm ship` and select a minor or major version
2. Merge the release commit to `main`
3. Wait for a public Ghost release to ship the new default version line

`pnpm ship` updates both the package version and Ghost's default Signup Form version.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
