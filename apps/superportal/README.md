# Superportal spike

Superportal is a spike for one reader-facing frontend runtime that replaces the current collection of separate public apps:

- `apps/portal`
- `apps/sodo-search`
- `apps/announcement-bar`
- the third-party `apps/signup-form` embed

The portal target ships a tiny bootstrap entry, a shell chunk, shared chunks, and one lazy feature chunk per enabled feature. The signup-form target still builds as a single UMD file for third-party embeds.

This package is private and not production-ready.

## Current Shape

```
src/
  shell/                bootstrap, state hydration, listeners, prefetch, modals, notifications
  features/
    members/            signin, signup, account, email prefs, data-members-form binding
    share/              social share modal, OG/meta reading, copy link
    gift/               gift purchase, redemption, post-checkout success
    announcement/       light-DOM announcement bar with dismissal
    search/             FlexSearch + Content API search-index modal
    offers/             offer landing and Stripe checkout
    donations/          support/donation Stripe redirect flow
    feedback/           post feedback email-link flow
    unsubscribe/        keyed newsletter unsubscribe flow
    recommendations/    recommendations modal and post-signup moment
  embed/
    signup-form/        third-party signup-form UMD bundle
  shared/
    api-client/         members/content API client and site-data hydration
    components/         shared modal, notification, magic-link, newsletter UI
    i18n/               locale loader, interpolation, direction helpers
    styles/             shared Tailwind/CSS assets
  build/
    locales-plugin.ts   emits per-locale JSON from ghost/i18n/locales/
public/
  preview.html          preview page for the built portal bundle
index.html              dev page that simulates a Ghost-rendered theme
```

## Runtime Model

Ghost v3 mode is enabled when `portal:version` coerces to semver `>= 3.0.0`.

In v3 mode `ghost_head` emits one shell script:

```html
<script
    defer
    type="module"
    src="/ghost/assets/portal/portal.min.js"
    data-ghost="https://example.com"
    data-admin-url="https://example.com/ghost/"
    data-key="content-api-key"
    data-locale="en"
    data-features="members,share,gift,..."
    data-superportal-shell
    crossorigin="anonymous"
></script>
```

It also emits the Stripe script when `paid_members_enabled` is true, matching legacy Portal.

The shell boots from script data attributes, then fetches:

- Content API settings for site configuration
- `/members/api/site/` for members-side site metadata such as Sentry config
- `/members/api/member/` for the current member, outside preview mode
- tiers and newsletters lazily via the Content API when member/gift/offer flows need them

There is no inline JSON state blob in the current implementation.

## Feature Gating

`computeV3Features` currently emits all 10 feature names when their gates pass:

| Feature | Server gate | Client dependency |
| --- | --- | --- |
| `members` | members, donations, or recommendations active; not `exclude="portal"` | none |
| `share` | not `exclude="share"` | none |
| `gift` | portal gate | requires `members` |
| `offers` | portal gate + paid members + not excluded | requires `members` |
| `donations` | donations enabled + not excluded | requires `members` |
| `announcement` | announcement configured or preview + not excluded | none |
| `search` | sodo-search frontend config has a script URL + not excluded | none |
| `feedback` | not excluded | none |
| `unsubscribe` | not excluded | none |
| `recommendations` | recommendations enabled + not excluded | none |

The client also applies defense-in-depth dependency rules before wiring triggers:

- `gift -> members`
- `offers -> members`
- `donations -> members`

Every trigger path goes through the same feature gate: `[data-portal]`, `[data-ghost-search]`, `Cmd/Ctrl+K`, hash routes, URL query triggers, eager mounts, and `window.PortalApi`.

## Running Locally

### Standalone Dev Page

Use this for UI work without a Ghost backend. The local `index.html` provides enough script attributes, meta tags, and sample triggers for modal/shell work.

```bash
cd apps/superportal
pnpm dev
```

Open `http://localhost:4175/`.

Useful standalone checks:

- `data-portal="share"` opens the share modal.
- `data-ghost-search` or `Cmd/Ctrl+K` opens search; live results need a real backend/key.
- `data-portal="signin"`, `signup`, `account`, `gift`, `offer/demo`, `support`, and `recommendations` route to their feature chunks.
- `#/share`, `#/portal/account`, `#/portal/gift/redeem/{token}`, and `#/feedback/{postId}/{score}/?uuid=&key=` hash routes are parsed.
- `<form data-members-form="signup">` is bound by the members eager mount.

### Built Portal Preview

```bash
cd apps/superportal
pnpm build
pnpm preview
```

Open `http://localhost:4175/preview.html`.

`pnpm build` emits `dist/portal/portal.min.js`, `dist/portal/chunks/*`, and `dist/portal/locales/*.json`, then runs `scripts/verify-pinned-dist.mjs` to ensure the bootstrap entry does not contain relative import specifier literals.

### Against Ghost Dev

Ghost's Docker dev gateway already proxies `/ghost/assets/portal/*` to `host.docker.internal:4175`. That means Superportal must take over port `4175`, which is also the legacy `apps/portal` dev-server port.

```bash
# Terminal 1, from the monorepo root
pnpm dev
```

Stop the legacy `apps/portal` dev server so port `4175` is free, then run Superportal on that port:

```bash
cd apps/superportal
pnpm build
pnpm preview
```

Set `portal.version` to a 3.x value in `ghost/core/config.local.json` and restart Ghost core:

```json
{
    "portal": {
        "version": "3.0.0-spike"
    }
}
```

Do not set `portal.url` for this workflow; the Docker environment owns that URL and Caddy uses it to reach the local preview server.

## Build Outputs

```bash
pnpm build                    # portal target -> dist/portal/
SP_TARGET=embed pnpm build    # embed target -> dist/embed/signup-form.min.js
```

Current production build, gzip sizes from `pnpm build`:

| Output | Gzip |
| --- | ---: |
| `portal.min.js` bootstrap | 0.35 KB |
| `chunks/shell.min.js` | 7.32 KB |
| `shared-react` | 58.23 KB |
| `shell-utils` | 40.63 KB |
| `shared-api-client` | 4.10 KB |
| `shared-modal-shell` | 0.71 KB |
| `feature-members` | 18.06 KB |
| `feature-search` | 19.18 KB |
| `feature-announcement` | 8.67 KB |
| `feature-gift` | 6.63 KB |
| `feature-share` | 5.43 KB |
| `feature-offers` | 3.11 KB |
| `feature-recommendations` | 2.60 KB |
| `feature-unsubscribe` | 2.43 KB |
| `feature-donations` | 1.71 KB |
| `feature-feedback` | 1.64 KB |
| `vendor-sentry` | 104.02 KB, lazy loaded only when Sentry DSN exists |

The eager portal path is roughly 111 KB gzip before enabled feature chunks are prefetched. `shell-utils` is larger than intended because shared feature-only helpers are currently grouped into an entry-reachable shared chunk.

The embed target currently builds `dist/embed/signup-form.min.js` at 65.84 KB gzip. It is UMD and single-file by design.

The portal target emits locale JSON files under `dist/portal/locales/{locale}.json`; the shell fetches the active locale and applies text direction before mounting features.

## Architecture Notes

- The bootstrap exists to avoid CDN range-version chunk skew: `portal.min.js` pins chunk URLs through `window.__superportalAssetUrl`.
- Feature chunks are prefetched after first paint when enabled, then mounted on demand.
- Modal features share one iframe-backed modal service; announcement remains light DOM.
- The shell owns state and services. Feature chunks receive a `Services` object instead of importing each other or reaching directly for globals.
- Share, search, announcement, feedback, unsubscribe, and recommendations are standalone at the dependency level.
- Gift, offers, and donations depend on members because they use members API checkout or redemption flows.
- Sentry is dynamically imported only when `/members/api/site/` supplies a DSN.
- FirstPromoter is loaded from settings when `firstpromoter_account` is present.
- Admin portal preview is handled by hash-encoded preview state and a preview API client.

## Current Limitations

This is still a spike. Current known issues are:

- The portal target has real test coverage, but not enough user-flow coverage for every feature modal.
- `shell-utils` eagerly ships feature-only shared code; split truly shell-needed utilities from lazy shared UI/helpers before treating bundle size as final.
- Signup-form embed styling still needs parity review against the old Tailwind v3 theme and breakpoint scale.
- Signup-form embed locale loading fetches `{siteUrl}/public/locales/{locale}/signup-form.json`; Ghost does not currently serve that endpoint.
- Some parity polish remains across features: gift card tilt/texture assets, donation success/error art, search sizing, share's old `execCommand` clipboard fallback, and some ported E2E/test selectors.
- Cache behavior for an unhashed `portal.min.js` entry still needs a production CDN decision. Local Ghost dev serves it with revalidation.
- The package has no ESLint boundary rule yet; cross-feature boundaries are maintained by convention and review.

## Verification Status

Latest local checks:

```bash
pnpm --dir apps/superportal build
SP_TARGET=embed pnpm --dir apps/superportal build
pnpm --dir apps/superportal test
```

Results:

- Portal build passed, including `verify-pinned-dist`.
- Embed build passed.
- Vitest passed: 22 test files, 150 tests.
