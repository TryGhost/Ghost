# @tryghost/app-sdk

The SDK a Ghost app uses to work with Ghost.

A Ghost app is a web page you host, which Ghost Admin shows in a frame, and a
backend that proves the app is yours. The SDK connects the page to Admin, signs
the app's manifest, and answers the challenge Ghost sends the backend.

It is not a framework or a host. You build and serve the page and the backend
yourself. It gives the app no API token either: the page calls the Admin API
through Admin, as the signed-in staff user.

> **Pre-alpha.** Anything here can change without notice, and no version
> promises compatibility with another. CI publishes each change on `main` to npm
> as the next `0.1.0-alpha.N`, under `latest`.

| Entry point                 | Runs in                    | What it's for                                                       |
| --------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `@tryghost/app-sdk`         | The app's page             | [Talking to Admin](#the-page)                                       |
| `@tryghost/app-sdk/backend` | Any platform with web APIs | [Answering Ghost's challenge](#the-backend)                         |
| `@tryghost/app-sdk/vite`    | Vite 6 or later            | [Signing the manifest in `vite dev` and `vite build`](#vite-plugin) |
| `ghost-app`                 | Node 22.12 or later        | [Creating keys and signing from the command line](#cli)             |
| `@tryghost/app-sdk/tooling` | Node 22.12 or later        | [The same from code](#tooling)                                      |

```sh
pnpm add @tryghost/app-sdk
```

The guides for building an app are in the
[app developer docs](https://tryghost.github.io/Apps/).

## The page

```ts
import { connect, GhostAppError } from '@tryghost/app-sdk';

try {
  const ghost = await connect();
  document.body.dataset.theme = ghost.theme.mode;

  const response = await ghost.fetch('/posts/?limit=5');
  const { posts } = await response.json();
} catch (error) {
  if (error instanceof GhostAppError && error.code === 'not_framed') {
    // The page was opened outside Ghost Admin.
  }
}
```

A page without a bundler can import `connect` from `dist/app-sdk.js` in the
package, a single ES module with no imports.

`connect(options?)` resolves with a `Ghost` once Admin has started the app.
`options.timeout` is how long to wait, in milliseconds (10 seconds by default).
Every call shares one connection, so load only one copy of the SDK in a page.

| `Ghost`                            | What it is                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `site`                             | `{ url, title, timezone, locale }`                                                                        |
| `user`                             | `{ id, role }` of the staff user. For more, call `fetch('/users/?filter=id:' + user.id)`.                 |
| `theme`, `onThemeChange(cb)`       | `{ mode, accent_color }`, where `mode` is `light` or `dark`, and a callback for when it changes.          |
| `session`                          | `{ revision }`: the installation's revision when the session started.                                     |
| `path.current`, `onPathChange(cb)` | The app's route, and a callback for when Admin moves the app, such as on back or forward.                 |
| `fetch(path, init?)`               | Calls the Admin API as the staff user. Resolves with a `Response`, whatever its status.                   |
| `open(place)`                      | Sends the staff user to `{ post: { id } }`, `{ page: { id } }`, `{ member: { id } }` or `{ apps: true }`. |
| `connected`, `onSessionEnd(cb)`    | `false` once the session has ended, and a callback for when it ends, called with the error.               |

Each `on…` method returns a function that unsubscribes. The
[SDK reference](https://tryghost.github.io/Apps/sdk-reference/) has every type.

### Calling the Admin API

`fetch` takes a path under the Admin API root, such as `/posts/?limit=5`, never
a URL. Admin API paths end in `/`. `init` takes `method`, `headers` and `body`.
A body is always JSON: pass an object, an array, or JSON text. Headers that
Admin sets itself, such as `authorization`, `cookie` and `content-type`, can't
be set.

Admin allows only some requests: reading and writing posts, pages and tags,
listing staff users, tiers and newsletters, and a few other reads such as
`GET /site/`. It refuses the rest as `blocked`, with a message that names what
was refused. A write can't set `codeinjection_head` or
`codeinjection_foot`, even to `null`, so to edit a post send its `updated_at`
and only the fields you change, not the object you read.

### Routes and the title

Route as you would anywhere, with `history.pushState`, `history.replaceState`
and links to the app's own origin. The SDK reports each move to Admin, which
shows the route in its own URL and keeps the history. Changes to
`location.hash` and moves through the Navigation API are not reported.

When Admin moves the app, the SDK sets the page's URL and dispatches `popstate`,
which a router follows. A page without a router loads the route itself, with
`ghost.onPathChange((path) => location.replace(path))`. Admin opens the page at
its route, so every route must load directly. The SDK also reports
`document.title` to Admin each time it changes.

### Errors

Every call on the page rejects with a `GhostAppError`. Its `code` says why, such
as `not_framed` when the page isn't in a frame, `not_connected` when Admin
didn't start the app in time, `blocked` when Admin doesn't allow a request, and
`session_ended` once the page has left its session. The
[SDK reference](https://tryghost.github.io/Apps/sdk-reference/#ghostapperrorcode)
lists every code.

## Signing the manifest

Ghost installs an app from its manifest URL, where the app serves a signed
manifest. You write the manifest as `ghost-app.json`, by the rules in
[`@tryghost/app-contracts`](../app-contracts/README.md#the-manifest). Signing
adds `manifest_url`, `identity_key`, `backend_key` and `development`, so leave
those out of the file. Ghost accepts a signed manifest only at the manifest URL
it was signed for.

Signing checks the manifest by the rules Ghost applies. To check the whole app,
install it on a Ghost site, which says why if it refuses.

The app has two keys. The manifest names the public half of each.

- The **identity key** signs the manifest. It stays with you, or with CI. It
  never goes to the backend or the page.
- The **backend key** signs the backend's answer to Ghost's challenge. The
  backend holds it as a secret. It never goes to the page.

The keys are files in the project, `.ghost-app/<mode>/identity.json` and
`.ghost-app/<mode>/backend.json`, where the mode is `development` or
`production`.

- **Git must ignore `.ghost-app/`**, and any file you copy a key into, such as
  `.dev.vars`. In a git repository, the SDK refuses to create keys unless git
  ignores `.ghost-app/`.
- **Back up the production identity key.** A site keeps the identity key it
  installed the app with, and treats a manifest signed with another key as
  another app. So the app on your machine and the deployed app are two apps to
  a site. The SDK never replaces an existing key.
- On Windows, a key file gets its folder's permissions, so keep the project in a
  folder only you can read. Elsewhere, only the file's owner can read it.

To sign for production without the key files, as in CI, set
`GHOST_APP_IDENTITY_KEY` to the production identity key and
`GHOST_APP_BACKEND_KEY` to the production backend key. Its public half is
enough, which `ghost-app backend-key --production --public` prints.
[App identity](https://tryghost.github.io/Apps/app-identity/) in the docs says
what to do when a key leaks or is lost.

## The backend

Ghost posts a challenge to `/.well-known/ghost-app/challenge` on the app's
origin, and the backend answers by signing it with the backend key.
`@tryghost/app-sdk/backend` uses only `Request`, `Response` and WebCrypto, so it
runs on Cloudflare Workers, Node, Bun and Deno.

`withGhostApp` wraps a fetch handler. It answers the challenge and passes every
other request to your `fetch`, which still serves the page and the manifest. It
returns `{ fetch }`, which a Cloudflare Worker can export as it is:

```ts
import { env } from 'cloudflare:workers';
import { withGhostApp } from '@tryghost/app-sdk/backend';

export default withGhostApp({
  backendKey: env.GHOST_APP_BACKEND_KEY,
  fetch: (request) => env.ASSETS.fetch(request),
});
```

With a router of your own, route `CHALLENGE_PATH` to
`handleChallenge(request, { backendKey })` instead.

- `backendKey` is the private backend key, as a JWK object or its JSON text. A
  value that isn't one throws a `TypeError`.
- `handleChallenge` answers only a challenge for the origin in `request.url`. If
  the backend doesn't see its public origin there, as Node behind a proxy that
  terminates TLS doesn't, pass it as `origin`, such as
  `https://app.example.com`. Take it from your configuration, never from a
  request header such as `X-Forwarded-Host`.
- `serveManifest(signed)` returns a `Response` for a signed manifest, from its
  text or its object, for a backend that doesn't serve it as a file.

## Vite plugin

```ts
import { ghostApp } from '@tryghost/app-sdk/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [ghostApp()] });
```

List it before `cloudflare()` in a Cloudflare Workers project. In `vite dev`,
the plugin:

- creates the development keys if they are missing;
- serves `/ghost-app.json`, signed for the address it is requested at: this
  machine, such as a name under `.localhost`, or a tunnel named in
  `GHOST_APP_TUNNEL_URL`. Any other host gets a `421`;
- prints the manifest URL, at a `.localhost` name taken from the app's ID, and
  an install link for the Ghost site in `GHOST_URL`, or `http://localhost:2368`;
- in a project with a Wrangler config, adds `GHOST_APP_BACKEND_KEY` to
  `.dev.vars` with the development backend key, or says where to add it, unless
  it is already set;
- stops Vite from serving `.ghost-app/`, `.dev.vars*`, `.env` and `.env.*`
  files, and refuses to start with `server.fs.strict` off.

In `vite build`, it signs `ghost-app.json` for `GHOST_APP_URL`, the app's public
address such as `https://hello.example.com`, with the production keys, and emits
it with the client build. A missing key fails the build. Without
`GHOST_APP_URL`, the build warns and emits no manifest.

The plugin reads `GHOST_APP_URL`, `GHOST_APP_TUNNEL_URL` (comma-separated) and
`GHOST_URL` from the environment, or from the mode's `.env` files as Vite reads
them. It refuses an `envPrefix` that would expose the key variables to the page,
such as `GHOST_APP_`. Its options are `manifest`, another file than
`ghost-app.json`, and `tunnelUrl`, in place of `GHOST_APP_TUNNEL_URL`.

## CLI

```sh
ghost-app keys [--production]
ghost-app sign --url <manifest URL> [--production] [--out <file>] [--manifest <file>]
ghost-app backend-key [--production] [--public | --check]
```

Run it as `pnpm exec ghost-app` in a project with the SDK installed. Commands
use the development keys unless you pass `--production`.

- `keys` creates the mode's keys, and keeps any that exist.
- `sign` prints the signed manifest, or writes it to `--out`. `--manifest` names
  another file than `ghost-app.json`.
- `backend-key` prints the private backend key, to pipe into a host's secret
  store. `--public` prints only its public half. `--check` prints nothing, and
  succeeds only if the key is there and usable, so a script can check before
  it pipes.

`ghost-app --dir <directory> <command>` runs a command for another project
directory. A command exits with `0` when it succeeds, `1` when it fails, with
the reason on stderr, and `2` when the command line was wrong.

## Tooling

`@tryghost/app-sdk/tooling` is what the CLI and the Vite plugin are built on:

```ts
import { createKeys, formatErrors, signProject } from '@tryghost/app-sdk/tooling';

await createKeys({ root: '.', mode: 'development' });

const manifestUrl = 'http://hello.localhost:5173/ghost-app.json';
const result = await signProject({ root: '.', mode: 'development', manifestUrl });
if (!result.success) {
  throw new Error(formatErrors(result.errors));
}
// result.signed is the signed manifest to serve at manifestUrl.
```

It also exports `signAppManifest`,
which signs with keys you pass in, `readSigningKeys`, `readBackendKey`,
`readManifestSource`, `generateKey`, `publicKeyOf` and `keyFile`. Signing throws
for a missing or unusable key.

## Known limits

- **The SDK can't tell who frames the page.** It connects to whichever window
  frames the page, and has no way yet to confirm that window is Ghost Admin. A
  site that frames the page can supply `site`, `user` and `theme`, and answer
  every `fetch` itself. No Ghost credential is in the page, but what the page
  shows and sends follows what that site tells it.
- **Serve only the app from its origin.** Admin connects any page on the app's
  origin that loads in the app's frame, and such a page can call `fetch` as the
  staff user. Keep user content and third-party pages on another origin.
- **Give the app a host of its own.** Ghost refuses an app on the site's or
  Admin's host, whatever the port. `vite dev` prints a `.localhost` name to use.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```sh
pnpm build   # the package to build/ and the browser bundle to dist/, with Vite
pnpm test    # type-check and unit tests, which need a build first (Nx runs it)
pnpm lint    # lint source and tests
```

It follows the [internal package golden path](../README.md), except where it
ships to apps: `build` bundles with Vite instead of compiling with `tsc`, and
inlines the parts of `@tryghost/app-contracts` the SDK uses, so the contracts
are a dev dependency. `test/bundle.test.ts` checks what each entry point
imports.
