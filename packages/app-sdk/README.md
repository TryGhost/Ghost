# @tryghost/app-sdk

The SDK apps use to talk to Ghost: from their page inside Admin, from their
backend, and from their tooling.

An app's page runs in a frame inside Ghost Admin. The SDK connects it to Admin,
gives it the site, the user and the theme, and lets it call the Admin API, keep
its route in sync with Admin's URL, and send the publisher elsewhere in Admin.

| Entry point                 | Runs in                    | What it's for                                                                                |
| --------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `@tryghost/app-sdk`         | The app's page             | Talking to Admin (below)                                                                     |
| `@tryghost/app-sdk/backend` | Any platform with web APIs | [Answering Ghost's challenge, serving the manifest, framing and the Admin API](#the-backend) |
| `@tryghost/app-sdk/tooling` | Node 22 or later           | [Creating keys, and signing and checking the manifest](#signing-the-manifest)                |
| `@tryghost/app-sdk/vite`    | Vite 6 or later            | [Signing the manifest in `vite dev` and `vite build`](#the-vite-plugin)                      |
| `ghost-app`                 | Node 22 or later           | [The same tooling on the command line](#the-ghost-app-cli)                                   |

The page's entry point loads none of the others' code.

> **Alpha.** CI publishes each change to npm as the next `0.1.0-alpha.N` under
> the `latest` tag. Alphas make no compatibility promise.

## Quick start

Without a bundler, load the bundle (`dist/app-sdk.js` in the package), a single
ES module with everything inlined:

```html
<script type="module">
  import { connect } from './app-sdk.js';

  const ghost = await connect();
  document.body.dataset.theme = ghost.theme.mode;
  ghost.onThemeChange((theme) => (document.body.dataset.theme = theme.mode));

  const response = await ghost.fetch('/posts/?limit=5');
  const { posts } = await response.json();
  document.title = `${posts.length} posts`; // Admin shows the title as its own
</script>
```

With a bundler, install the package. It includes the types and code it uses
from Ghost's contracts, so its only dependency is `@quilted/threads`:

```sh
pnpm add @tryghost/app-sdk
```

```ts
import { connect, GhostAppError } from '@tryghost/app-sdk';

try {
  const ghost = await connect();
  history.pushState(null, '', '/episodes/12'); // or your router's navigate(); Admin's URL follows
} catch (error) {
  if (error instanceof GhostAppError && error.code === 'not_framed') {
    // Opened outside Admin: show a link to the site's Admin instead.
  }
}
```

## API

`connect(options?)` resolves with a `Ghost` once Admin has started the app. Call
it as soon as the page loads. Every call shares one connection. Load the SDK
only once per page: if a second copy calls `connect()`, it rejects with
`duplicate_sdk`. `options.timeout` is how long to wait, in milliseconds (10
seconds by default).

Admin connects each document in the frame only once. After Admin has replied,
that connection is the only one the page gets. If it fails or its session ends,
every `connect()` rejects with the error it ended with, until the page reloads.
A failure before Admin replied, such as `not_framed` or a timeout with no reply,
can be retried.

| `Ghost`                   | What it is                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `site`                    | `{ url, title, timezone, locale }`                                                                                                                                                   |
| `user`                    | `{ id, role }` of the staff user. No name or email. To read those, use `fetch('/users/?filter=id:' + user.id)` (`/users/:id/` isn't allowed), where app scopes will apply.           |
| `theme`                   | `{ mode, accent_color }` that Admin currently uses. `mode` is `light` or `dark`, never `system`.                                                                                     |
| `onThemeChange(callback)` | Called with the new theme when the publisher switches. Returns a function that unsubscribes.                                                                                         |
| `session`                 | `{ revision }`: the installation's revision when the session started.                                                                                                                |
| `path.current`            | The app's route: the path, query and fragment of the page's URL, such as `/episodes/12`, normalised the way Admin stores it (`..` resolved, escaped once).                           |
| `onPathChange(callback)`  | Called when Admin moves the app: back or forward in Admin, or one of Admin's links. The page's URL is already there and `popstate` has fired; a multi-page app loads it (see below). |
| `fetch(path, init?)`      | Calls the Admin API as the staff user. `path` is relative to the API root (`/posts/?limit=5`), never a URL. Resolves with a real `Response`.                                         |
| `open(place)`             | Sends the publisher to `{ post: { id } }`, `{ page: { id } }`, `{ member: { id } }` or `{ apps: true }`. Rejects with `rejected` if they're already leaving the app.                 |
| `connected`               | `false` once the session has ended.                                                                                                                                                  |
| `onSessionEnd(callback)`  | Called once, with the `session_ended` error, when this document leaves the app session (a reload, form post or link) or the session ends.                                            |

`site`, `user`, `session` and `theme` are frozen, so no part of the page can
change what the rest of it reads.

`fetch` takes `method` (any case), `headers` (anything `Headers` accepts) and
`body`, which is always JSON. Text is sent unchanged and must be JSON; an object
or array is sent as JSON. Admin labels it as JSON itself. A body on `GET`, a
binary body and the headers only Admin sets are refused: `cookie`,
`authorization`, `content-type`, `content-encoding`, `x-ghost-*`, `origin` and
similar. Any
status comes back as a `Response`. `fetch` rejects only when Admin refuses to
make the request.

### Admin API access

`fetch` reaches only these routes, grouped by the scope that will allow them once
apps have their own token. Anything else is refused as `blocked`. `:id` is an
object ID, 24 lowercase hexadecimal characters; a slug is one path segment.

| Scope              | Routes                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------- |
| `posts:read`       | `GET /posts/`, `GET /posts/:id/`, `GET /posts/slug/:slug/`, `GET /search-index/posts/` |
| `posts:write`      | `POST /posts/`, `PUT /posts/:id/`, `DELETE /posts/:id/`                                |
| `pages:read`       | `GET /pages/`, `GET /pages/:id/`, `GET /pages/slug/:slug/`, `GET /search-index/pages/` |
| `pages:write`      | `POST /pages/`, `PUT /pages/:id/`, `DELETE /pages/:id/`                                |
| `tags:read`        | `GET /tags/`, `GET /tags/:id/`, `GET /tags/slug/:slug/`, `GET /search-index/tags/`     |
| `tags:write`       | `POST /tags/`, `PUT /tags/:id/`, `DELETE /tags/:id/`                                   |
| `users:read`       | `GET /users/`                                                                          |
| `tiers:read`       | `GET /tiers/`                                                                          |
| `newsletters:read` | `GET /newsletters/`                                                                    |
| `site:read`        | `GET /site/`                                                                           |
| `slugs:read`       | `GET /slugs/:type/:name/`, `GET /slugs/:type/:name/:id/`                               |

An app can't ask Ghost to email a post, set a post's code injection or write
mobiledoc. The one exception: publishing a post that a staff member already
scheduled with a newsletter sends its email, as it would have at the scheduled
time.

- A write may carry only the query parameters its scope lists: `include`,
  `formats` and `save_revision` for posts and pages, and `include` for tags.
  Any other name is refused, `newsletter`, `email_segment` and `source`
  included, however it's written.
- `codeinjection_head` and `codeinjection_foot` are refused with any value, even
  `null`, on posts, pages and tags: leave them out of the body.
- `mobiledoc` must be `null` or left out: it's deprecated and Ghost 7.0 removes
  it. Write `lexical` instead.
- The SDK and Admin set the body's content type themselves; an app can't set
  `content-type` or `content-encoding`.

To edit a post, send `updated_at` and only the fields you change, never the
object you read: it comes back with `codeinjection_head` and
`codeinjection_foot` as `null`, which are refused even as `null`.

```ts
const { posts } = await (await ghost.fetch(`/posts/${id}/`)).json();
await ghost.fetch(`/posts/${id}/`, {
  method: 'PUT',
  body: { posts: [{ updated_at: posts[0].updated_at, title: 'New title' }] },
});
```

The tags you send replace the post's tags. The tags you read come back with
`codeinjection_head` and `codeinjection_foot` too, so send each as `{ id }`, or
`{ name }` for a new one:

```ts
const tags = posts[0].tags.map(({ id }) => ({ id }));
await ghost.fetch(`/posts/${id}/`, {
  method: 'PUT',
  body: { posts: [{ updated_at: posts[0].updated_at, tags: [...tags, { name: 'Featured' }] }] },
});
```

These checks are a stopgap for the private beta. They're reviewed again before
anyone outside the team gets access, and app scopes replace them.

The refusal names the method and path, or what in the request was refused, as
in `blocked: Apps can't send codeinjection_head to PUT /posts/…/`.

### Routes and history

Admin keeps the history, and the app routes as it would anywhere: with
`history.pushState` and `history.replaceState`, which any router uses, and with
links. The SDK turns each into a single entry in Admin's history:

- `pushState` and a click on a link to the app's own origin add an entry in
  Admin; `replaceState` replaces Admin's current one. The frame itself keeps a
  single entry, so back and forward are always Admin's.
- A link loads its page in place of the frame's entry, after Admin has recorded
  the move. A link with a `target`, a `download` or a modifier key is left alone,
  and so is one a router has already handled.
- When the publisher goes back or forward, or Admin moves the app itself, the
  SDK puts the page's URL there, with the state the app last gave that route,
  and dispatches `popstate`, so a router shows it. A multi-page app, with no
  router, loads it: `ghost.onPathChange((path) => location.replace(path))`.
- Admin opens the app's page at its route, so each route must load directly, as
  with any app that uses browser history. If the page ends up elsewhere, through
  a redirect from its server or a form's result, Admin follows the page.

Not intercepted, so each still adds an entry of the frame's own, which back
steps through without Admin: a form that posts, a change to `location.hash`,
and the Navigation API. Route with the History API rather than the hash.

### The frame

The frame is sandboxed. The page runs scripts and posts forms on its own origin,
with that origin's storage and cookies, and can open popups and download files.
It can't navigate Admin's tab, and `alert`, `confirm` and `prompt` return at
once (`confirm` with `false`), so an app brings its own dialogs. Browser features
such as the camera, geolocation and fullscreen are off.

A popup is sandboxed the same way: it can load any page and `postMessage` back
to the app, but it can't navigate other windows, Admin's included, or show
`alert` or `confirm`. To send the publisher somewhere in Admin, use `open`.

The SDK reports the page's title automatically. It watches `<title>`, and Admin
shows the title, up to 200 characters, while the page is open. Characters that
reorder or hide text, such as direction marks, are removed.

## Errors

Every rejection is a `GhostAppError`, whose `code` gives the reason:

| `code`             | Means                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not_framed`       | The page is not inside a frame, so there is no Admin to talk to.                                                                                           |
| `not_connected`    | Admin did not start the app before the timeout.                                                                                                            |
| `duplicate_sdk`    | Another copy of the SDK in the page called `connect()` first, because the page loads the SDK more than once. Load a single copy for the whole page.        |
| `invalid_context`  | Admin started the app with a context this SDK cannot read. Updating the SDK usually fixes it.                                                              |
| `session_ended`    | The channel to Admin has closed, usually because Admin is reloading the app or the page navigated away from the document. Every call fails after that.     |
| `invalid_argument` | The app passed something that cannot be sent, such as a body on a `GET`.                                                                                   |
| `invalid_path`     | `fetch` was given a URL, a path that leaves the Admin API, or a path the Admin API only redirects, such as `/posts` without its trailing `/`.              |
| `unsupported`      | This site's Ghost version predates the call. The message names the call.                                                                                   |
| `blocked`          | A request the allowlist doesn't allow, such as `GET /db/`, or a write that could send email, set code injection or carry mobiledoc (see Admin API access). |
| `network_error`    | Admin could not reach its own API.                                                                                                                         |
| `rejected`         | Admin refused for another reason; the message says why.                                                                                                    |

## How it connects

The SDK posts `{ type: 'ghost-app:hello', sdk: <version>, document: <id> }` to
`window.parent` every 250 ms until Admin replies with `ghost-app:connect`, a
`MessagePort` and the names of the calls Admin exports. `document` is a random
ID the SDK makes when it loads. It stays the same for the life of the
document, so Admin can tell whether a hello comes from a page it has already
connected or from a new page. The SDK accepts only the first reply, and only
from the parent window. Over the port, it uses
[`@quilted/threads`](https://github.com/lemonmade/quilt/tree/main/packages/threads)
for the calls `@tryghost/app-contracts/bridge` defines, and Admin then calls
`start`. The SDK refuses a call that the connect message didn't list with
`unsupported`, without sending it. Admin only ever adds calls, so an older Admin
lacks the newer ones.

Only an error's message survives the channel, so Admin puts the code at the
start of the message, as in `blocked: Apps can't use GET /db/`. The SDK splits it
back into `code` and `message`. A message without a known code arrives as
`rejected`. The SDK refuses Admin's calls the same way: `invalid_context: …` for
a start context it can't read or a call before the start, and
`invalid_argument: …` for a theme or path it can't read. The codes and their
format are defined once, in `@tryghost/app-contracts`.

The session ends when the port closes (in browsers that report it, such as
Chromium), when a message on it can't be read, or when Admin refuses a call with
`session_ended`. Admin does that to every pending call when it releases the app.
In other browsers, a page Admin has released is removed along with its frame.

When a reload, a form post or a link within the app loads a new document in the
frame, Admin starts it in place. Admin hides the frame until the new document's
SDK has connected, then starts it with Admin's current route, so the page shows
what the form or link loaded, and Admin follows the new document's address. The
old document's session ends with it. A new document must
connect within the same 10 seconds, or Admin reloads the app's page. A page that
keeps reloading or navigating away is shown as not responding: more than five
documents in a row, each replaced within three seconds of starting. A publisher
clicking quickly through more than five pages of a multi-page app would trip it
too.

## Signing the manifest

Ghost installs an app from its manifest URL, where the app serves a signed
manifest: its `ghost-app.json`, with the fields below added, signed with the
app's identity key. Ghost pins that key when a site installs the app, and
challenges the app's origin to prove it holds the backend key the manifest
names. The manifest format is in
[`@tryghost/app-contracts`](../app-contracts/README.md#the-manifest).

`ghost-app.json` is the readable part, which the project keeps:

```json
{
  "id": "com.example.hello",
  "name": "Hello",
  "description": "Says hello.",
  "author": { "name": "Example", "url": "https://example.com" },
  "accent_color": "#ff5500",
  "icon": { "name": "hand" },
  "surfaces": [{ "type": "admin_page", "url": "/" }]
}
```

Signing adds `manifest_url` (the address it's signed for), `identity_key` and
`backend_key` (the public keys) and `development`, and refuses a file that sets
any of them. It checks the manifest with the rules Ghost applies first, so a
manifest Ghost would refuse is never signed: the error lists every problem by
field. Ghost also refuses a manifest that points at the site's own origin, which
only Ghost knows.

### Keys

Each mode has its own identity key and backend key, as two pairs of private
Ed25519 JWKs, in files only their owner can read:

- `.ghost-app/development/identity.json` and `backend.json`, for `vite dev`
  and apps on `localhost`, which the Vite plugin creates on its first run;
- `.ghost-app/production/identity.json` and `backend.json`, which only
  `ghost-app keys --production` creates.

Keys are created only when git ignores `.ghost-app/` (in a repository), and an
existing key is never replaced. Keep a copy of the production identity key
somewhere safe: sites keep the identity key they installed an app with, and a
manifest signed with another one is another app. A development installation
and a production one are different apps for the same reason, so going from your
computer to a host means installing the app again.

The identity key stays with the developer, or CI. It never reaches the backend
or a build: only the signed manifest is served or emitted. The backend key goes
to the backend, which answers challenges with it. Developers who share a
development identity key must share its backend key too: a new backend key
retires the old one on every site that reads the new manifest.

In CI, set `GHOST_APP_IDENTITY_KEY` to the production identity key and
`GHOST_APP_BACKEND_KEY` to the backend key (its public half is enough), in place
of the files.

### The Vite plugin

```ts
import { cloudflare } from '@cloudflare/vite-plugin';
import { ghostApp } from '@tryghost/app-sdk/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [ghostApp(), cloudflare()] });
```

In `vite dev`, the plugin creates the development keys if there are none, and
serves `/ghost-app.json` signed for the address it's requested at:
`http://localhost:<port>/ghost-app.json`, another name for the machine on that
port, or a tunnel named by the `tunnelUrl` option or `GHOST_APP_TUNNEL_URL`
(comma-separated). It refuses any other host with a 421, so the dev server
never signs a manifest for someone else's address. Ghost in Docker reaches
`localhost` through `host.docker.internal` with the original Host, which counts
as `localhost`. It prints the install link, for `GHOST_URL` or
`http://localhost:2368`.

In a Cloudflare Workers project (one with a `wrangler.json`, `wrangler.jsonc`
or `wrangler.toml`), it adds `GHOST_APP_BACKEND_KEY` to `.dev.vars` with the
development backend key, so the Worker answers challenges in development as it
does in production. It never changes a value that's already there, says so when
it differs, and writes nothing unless git ignores `.dev.vars`.

In `vite build`, it signs `ghost-app.json` for `GHOST_APP_URL`, the app's public
address (the manifest is at `<GHOST_APP_URL>/ghost-app.json`), with the
production keys, and emits it with the client build. A missing key fails the
build with how to create one; the plugin never creates a production key.
Without `GHOST_APP_URL`, the build emits no manifest and warns.

List the plugin before `cloudflare()`. `options.manifest` names another file
than `ghost-app.json`.

### The ghost-app CLI

```sh
ghost-app keys [--production]
ghost-app sign --url <manifest URL> [--production] [--out <file>]
ghost-app check <manifest URL>
ghost-app backend-key [--production] | wrangler secret put GHOST_APP_BACKEND_KEY
```

- `keys` creates the mode's keys, keeping any that exist.
- `sign` prints the signed manifest, or writes it to `--out`.
- `check` checks an app as Ghost does before installing it: it fetches the
  signed manifest, verifies it, and challenges the app's origin, even on
  `localhost`, which Ghost in development doesn't. A failure is reported with
  Ghost's own code, such as `APP_MANIFEST_URL_MISMATCH`,
  `APP_MANIFEST_SIGNATURE_INVALID` or `APP_CHALLENGE_FAILED`, and what exactly
  was wrong. It can't check what only a site knows: the key it installed the app
  with, and backend keys a newer manifest replaced.
- `backend-key` prints the mode's private backend key, for a host's secret
  store. It's the only command that prints a private key.

`--dir` points any of them at another project directory.

### From code

`@tryghost/app-sdk/tooling` is what the plugin and the CLI are built on:

| Export                                                                           | What it does                                                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createKeys({ root, mode })`                                                     | Creates the mode's missing keys. Resolves with `{ created, kept }`.                             |
| `readSigningKeys({ root, mode, env? })`                                          | The identity key and the backend key's public half, from the files or, in production, `env`.    |
| `readBackendKey({ root, mode })`                                                 | The mode's private backend key.                                                                 |
| `signProject({ root, mode, manifestUrl, manifestFile? })`                        | Signs the project's `ghost-app.json` with the mode's keys.                                      |
| `signAppManifest(source, { manifestUrl, identityKey, backendKey, development })` | Signs a manifest with the keys given.                                                           |
| `checkApp(manifestUrl, { fetch? })`                                              | What `ghost-app check` runs. Resolves with the parsed manifest, or a failure with Ghost's code. |
| `generateKey()`, `publicKeyOf(key)`                                              | A new private key, and a key's public half.                                                     |

Signing resolves with `{ success: true, signed, manifest }`, or
`{ success: false, code, errors }`.

## The backend

`@tryghost/app-sdk/backend` uses only `Request`, `Response`, `fetch` and
WebCrypto, so the same code runs on Cloudflare Workers, Node, Bun and Deno, and
in frameworks such as Hono. Configuration is passed in.

```ts
import { CHALLENGE_PATH, allowFraming, handleChallenge } from '@tryghost/app-sdk/backend';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === CHALLENGE_PATH) {
      return handleChallenge(request, { backendKey: env.GHOST_APP_BACKEND_KEY });
    }
    return allowFraming(await env.ASSETS.fetch(request), {
      adminOrigins: ['https://site.example'],
    });
  },
};
```

| Export                                     | What it does                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handleChallenge(request, { backendKey })` | Answers Ghost's challenge, posted to `CHALLENGE_PATH`, with the backend key: a private JWK, or its JSON as a secret holds it. `405` for any method but `POST`, `413` past 4 KB, `400` for anything that isn't a challenge for `request.url`'s origin, `200` with the answer. |
| `serveManifest(signed)`                    | A response for the signed manifest, for a backend that doesn't serve it as a file. Caches must revalidate it, so a new manifest reaches Ghost the next time it reads it.                                                                                                     |
| `allowFraming(response, { adminOrigins })` | A copy of a page's response that only those Ghost Admin origins may frame: it sets `frame-ancestors` in its Content-Security-Policy and drops `X-Frame-Options`.                                                                                                             |
| `createAdminApiToken(key)`                 | A 5-minute Admin API token from a custom integration's Admin API key (`<id>:<secret>`), for `Authorization: Ghost <token>`.                                                                                                                                                  |
| `createAdminApiClient({ url, key })`       | A client whose `fetch(path, init?)` calls the site's Admin API with a fresh token. `path` is relative to the API root (`/posts/?limit=5`), never a URL.                                                                                                                      |

`handleChallenge` refuses a challenge for any origin but the one the platform
reports in `request.url`, so pass the request as the platform hands it over,
never one rebuilt from `X-Forwarded-Host`. Serving the manifest and answering
the challenge need no Admin API key. Only calls to the Admin API do: keep the
key on the server, and don't expose the client as an endpoint that relays any
path, as the key can do anything its integration can.

## Who can frame the page

The SDK talks to whichever window frames the page. It can't know a site's Admin
origin in advance, so if any site can frame the page, any site can fool it: send
it a start context of its choosing, and answer every `fetch` itself. No Ghost
credential is ever in the page. But whatever the publisher types into the page
is exposed, and the app acts on whatever responses it gets.

Serve app pages with a `frame-ancestors` Content Security Policy that names the
Ghost Admin origins of the sites using the app, so nothing else can frame them.
The backend's `allowFraming` sets it:

```http
Content-Security-Policy: frame-ancestors https://site.example
```

Admin is usually on the site's own origin, or on a separate Admin domain when
the site has one. An app installed on many sites can build the list from its
own record of where it is installed.

## Serve only the app from its origin

Admin replies to any page on the app's origin that sends a hello from the app's
frame, and can't tell the app's own pages apart from anything else served there.
Any such page gets the whole bridge, including `fetch` as the staff user with
their session. So the origin must serve only the app. Keep user-generated
content and third-party pages or widgets on another origin (a separate subdomain
counts). An open redirect is a risk too: a link through it puts another site's
page in the frame, inside Admin.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # the package to build/ and the browser bundle to dist/, with Vite
pnpm test    # type-check + unit tests (jsdom for the page, with a fake Admin on a real
             # MessageChannel; Node for the backend, tooling, CLI and plugin), which build both
             # afresh to check what they import, and pack build/ and dist/ to use them from an
             # app outside the workspace (after pnpm build; Nx runs it)
pnpm lint    # lint source and tests
```

It follows the [internal package golden path](../README.md), except where it
ships to apps. Its `build` bundles with Vite instead of compiling with `tsc`,
and also writes `dist/`, which is in `files` and in the Nx build outputs.

It uses `@tryghost/app-contracts` for the bridge's message types, limits and
shape checks, so the SDK and Admin apply the same rules to paths, themes and
start contexts, and for signing and checking manifests and challenges, so the
tooling and the backend apply Ghost's own rules. The build inlines what it uses
into the SDK, so the contracts are a dev dependency. `build/` has an ES module
per entry point, which share chunks:

- `index.js` loads only `@quilted/threads`, never `jose`, `zod` or a Node
  builtin;
- `backend.js` loads only `jose` and `zod`, and no Node builtin;
- `tooling.js`, `vite.js` and `bin.js` load Node builtins, `jose` and `zod`;
  `vite.js` imports only Vite's types, as Vite is an optional peer dependency;
- each entry point's declarations, emitted by TypeScript 7 and bundled by
  `rolldown-plugin-dts`, import nothing, but Vite's types for `vite.d.ts`;
- `dist/` imports nothing at all.

`test/bundle.test.ts` checks this on a fresh build. The build fails if the page
or the backend imports a Node builtin, which Vite would otherwise replace with
an empty stub.
