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

Run `pnpm dev:standalone` from this directory to start the standalone
development server with HMR. It serves the demo page at
<http://localhost:6173>.

`pnpm dev` on its own (in this package folder) only builds `umd/signup-form.min.js` and watches for changes — it does not bind a port. The UMD is served by Caddy at http://localhost:2368/ghost/assets/signup-form/signup-form.min.js when you run `pnpm dev:public` from the monorepo root.

### Using the UMD build during development

Vite's development server uses an ESM output for HMR. When a script is loaded as
an ESM module (`<script type="module" src="...">`), `document.currentScript` is
not available. Signup Form needs it to determine where to inject the iframe, so
development mode uses a workaround that is not suitable for production.

To test the production behavior, open <http://localhost:6173/preview.html> while
`pnpm dev:standalone` is running. The page loads the UMD bundle from the
development gateway, so `pnpm dev:public` must also be running from the monorepo
root.

## Test

- `pnpm lint` runs ESLint.
- `pnpm test:acceptance` runs acceptance tests on Chromium.
- `pnpm test:acceptance:slowmo` runs acceptance tests headed and slowed down on
  Chromium.
- `pnpm test:acceptance:full` runs acceptance tests on all configured browsers.

## Release

Patch releases are automatic. When Signup Form changes on `main`, CI publishes the next patch version to npm and clears the jsDelivr cache. Sites using that major/minor line receive the patch without a Ghost release.

For an intentional minor or major release:

1. From a clean branch, run `pnpm ship` and select a minor or major version
2. Merge the release commit to `main`
3. Wait for a public Ghost release to ship the new default version line

`pnpm ship` updates both the package version and Ghost's default Signup Form version.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
