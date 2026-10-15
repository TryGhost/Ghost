# Portal

[![npm version](https://badge.fury.io/js/%40tryghost%2Fportal.svg)](https://badge.fury.io/js/%40tryghost%2Fportal)

[Drop-in script](https://ghost.org/help/setting-up-portal/) to make the bulk of Ghost membership features work on any theme.

## Usage

Ghost automatically injects the Portal script on all sites running Ghost 4 or
higher.

Alternatively, Portal can be enabled on pages outside Ghost by adding this
script:

```html
<script defer src="https://unpkg.com/@tryghost/portal@latest/umd/portal.min.js" data-ghost="https://mymemberssite.com"></script>
```

The `data-ghost` attribute expects the URL for your Ghost site, which is the only input Portal needs to work with your site's membership data via Ghost APIs.

### Custom trigger button

By default, the script adds a default floating trigger button on the bottom right of your page which is used to trigger the popup on screen.

You can add a custom trigger by adding the `data-portal` attribute to any HTML
element. Set its value to choose a specific
[Portal page](https://github.com/TryGhost/Ghost/blob/main/apps/portal/src/pages.js),
for example `data-portal="signup"`.

Share modal can be opened with `data-portal="share"` (or `#/share`).

Default (zero-config) usage:

```html
<button type="button" data-portal="share">Share</button>
```

On pages where `{{ghost_head}}` is rendered, Portal will auto-resolve metadata from DOM tags:

- URL: canonical URL (or current URL fallback)
- Title: Open Graph title (or document title fallback)
- Image: Open Graph image (or Twitter image fallback)

Troubleshooting missing preview metadata:

1. Verify the template includes `{{ghost_head}}`.
2. Verify rendered HTML contains canonical + OG/Twitter tags.

The script adds `gh-portal-open` and `gh-portal-close` classes to custom triggers
to reflect the popup state.

See the [Portal settings documentation](https://ghost.org/help/setup-members/#customize-portal-settings)
for ways to customize Portal for your site.

### Bot challenges from a CDN or WAF

A CDN or WAF in front of Ghost can challenge the signup endpoints,
`/members/api/integrity-token/` and `/members/api/send-magic-link/`. When it
does, Portal (and `data-members-form` forms) solves the challenge in a
same-origin frame and retries the request once. The frame stays hidden unless
the visitor has to do something; a visitor who closes it sees "Unable to verify
your request, please try again". A block from the edge shows the same message.

Supported edges, in `src/utils/edge-challenge/`:

- **Fastly Next-Gen WAF**: client challenges (detected by their `/_fs-ch-`
  assets) and blocks (406, 449).
- **Cloudflare**: managed, JavaScript and interactive challenges (detected by
  the `cf-mitigated: challenge` header) and block or rate limiting pages (403,
  429 with `cf-ray` and an HTML body). The frame loads the challenged URL with a
  GET, so the WAF rule has to match the endpoint's path, not only `POST`
  requests, for example:

  ```txt
  http.request.uri.path in {"/members/api/send-magic-link/" "/members/api/integrity-token/"}
  ```

  The clearance lasts as long as the zone's Challenge Passage (30 minutes by
  default).

Challenges can only be solved for the site the page is on. A request to another
site, such as subscribing to a recommendation, fails with the same message.

## Develop

Run Portal's build watcher with the other public apps from the monorepo root:

```bash
pnpm dev:public
```

Portal rebuilds as you edit and is served at
`http://localhost:2368/ghost/assets/portal/portal.min.js`, which theme pages on
the development site load. `pnpm dev` serves the build from when it started.

## Build

From this directory, create a production minified bundle in
`umd/portal.min.js` with:

```bash
pnpm build
```

## Test

From this directory, run unit tests once or in watch mode with:

```bash
pnpm test
pnpm test:watch
```

### Ghost e2e tests

Portal is primarily tested through Ghost's Playwright tests in the `e2e/`
directory. Run them from the monorepo root:

```bash
pnpm test:e2e
```

## Release

Patch releases are automatic. When Portal changes on `main`, CI publishes the next patch version to npm and clears the jsDelivr cache. Sites using that major/minor line receive the patch without a Ghost release.

If you're releasing new code that should not immediately go live _always_ use a minor or major version when publishing.

For an intentional minor or major release:

1. From a clean branch, run `pnpm ship` and select a minor or major version
2. Merge the release commit to `main`
3. Wait for a public Ghost release to ship the new default version line

`pnpm ship` updates both the package version and Ghost's default Portal version.

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](https://github.com/TryGhost/Ghost/blob/main/LICENSE).
