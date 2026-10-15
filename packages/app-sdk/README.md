# @tryghost/app-sdk

The SDK apps use to talk to Ghost from inside Admin.

An app's page runs in a frame inside Ghost Admin. The SDK connects it to Admin,
gives it the site, the user and the theme, and lets it call the Admin API, keep
its route in sync with Admin's URL, and send the publisher elsewhere in Admin.

> **Unreleased.** The package is `private` and not published to npm yet. The
> pre-release will change that. Until then, build it in a Ghost checkout and use
> it from there (see below), or load its browser bundle.

## Quick start

Build the SDK in a Ghost checkout first, from `packages/app-sdk`, with
`pnpm build`.

Without a bundler, load the bundle (`dist/app-sdk.js`), a single ES module with
everything inlined:

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

With a bundler, depend on the built package through a `file:` link, or run
`pnpm link ../Ghost/packages/app-sdk` in the app. The package includes the types
and code it uses from Ghost's contracts, so its only dependency is
`@quilted/threads`:

```json
{ "dependencies": { "@tryghost/app-sdk": "file:../Ghost/packages/app-sdk" } }
```

```ts
import { connect, GhostAppError } from '@tryghost/app-sdk';

try {
  const ghost = await connect();
  await ghost.path.set('/episodes/12'); // the app has routed; Admin's URL follows
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

| `Ghost`                       | What it is                                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site`                        | `{ url, title, timezone, locale }`                                                                                                                                      |
| `user`                        | `{ id, role }` of the staff user. No name or email. To read those, use `fetch('/users/?filter=id:' + user.id)` (`/users/:id/` is blocked), where app scopes will apply. |
| `theme`                       | `{ mode, accent_color }` that Admin currently uses. `mode` is `light` or `dark`, never `system`.                                                                        |
| `onThemeChange(callback)`     | Called with the new theme when the publisher switches. Returns a function that unsubscribes.                                                                            |
| `session`                     | `{ revision }`: the installation's revision when the session started.                                                                                                   |
| `path.current`                | The app's own route from Admin's URL, such as `/episodes/12`. `/` when the URL has none. Normalised the way Admin stores it: `..` resolved and escaped once.            |
| `path.set(path, { replace })` | Tells Admin the app moved to another of its routes, so the address bar, reloads and the back button reflect it. It does not navigate the page.                          |
| `onPathChange(callback)`      | Called when Admin's URL changes within the app, through back, forward or a link. Not called for the app's own `path.set`.                                               |
| `fetch(path, init?)`          | Calls the Admin API as the staff user. `path` is relative to the API root (`/posts/?limit=5`), never a URL. Resolves with a real `Response`.                            |
| `open(place)`                 | Sends the publisher to `{ post: { id } }`, `{ page: { id } }`, `{ member: { id } }` or `{ apps: true }`. Rejects with `rejected` if they're already leaving the app.    |
| `connected`                   | `false` once the session has ended.                                                                                                                                     |
| `onSessionEnd(callback)`      | Called once, with the `session_ended` error, when the session ends.                                                                                                     |

`site`, `user`, `session` and `theme` are frozen, so no part of the page can
change what the rest of it reads.

`fetch` takes `method` (any case), `headers` (anything `Headers` accepts) and
`body`. Text is sent unchanged. An object or array is sent as JSON, with
`content-type: application/json` unless the app set one. A body on `GET` or
`HEAD`, a binary body and a multipart content type are refused, because apps
can't upload files yet. So are the headers only Admin sets: `cookie`,
`authorization`, `x-ghost-*`, `origin` and similar. Any status comes back as a
`Response`. `fetch` rejects only when Admin refuses to make the request.

The SDK reports the page's title automatically. It watches `<title>`, and Admin
shows the title, up to 200 characters, while the page is open. Characters that
reorder or hide text, such as direction marks, are removed.

## Errors

Every rejection is a `GhostAppError`, whose `code` gives the reason:

| `code`             | Means                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not_framed`       | The page is not inside a frame, so there is no Admin to talk to.                                                                                                                        |
| `not_connected`    | Admin did not start the app before the timeout.                                                                                                                                         |
| `duplicate_sdk`    | Another copy of the SDK in the page called `connect()` first, because the page loads the SDK more than once. Load a single copy for the whole page.                                     |
| `invalid_context`  | Admin started the app with a context this SDK cannot read. Updating the SDK usually fixes it.                                                                                           |
| `session_ended`    | The channel to Admin has closed, usually because Admin is reloading the app or the page navigated away from the document. Every call fails after that.                                  |
| `invalid_argument` | The app passed something that cannot be sent, such as a body on a `GET`.                                                                                                                |
| `invalid_path`     | `fetch` was given a URL, a path that leaves the Admin API, or a path the Admin API only redirects, such as `/posts` without its trailing `/`. Or `path.set` was given an invalid route. |
| `unsupported`      | This site's Ghost version predates the call. The message names the call.                                                                                                                |
| `blocked`          | An Admin API route apps aren't allowed to use, such as `/db/` or `/integrations/`.                                                                                                      |
| `network_error`    | Admin could not reach its own API.                                                                                                                                                      |
| `rejected`         | Admin refused for another reason; the message says why.                                                                                                                                 |

## How it connects

The SDK posts `{ type: 'ghost-app:hello', sdk: <version>, document: <id> }` to
`window.parent` every 250 ms until Admin replies with `ghost-app:connect`, a
`MessagePort` and the names of the calls Admin exports. `document` is the page's
`performance.timeOrigin` as text. It stays the same for the life of the
document, so Admin can tell whether a hello comes from a page it has already
connected or from a new page. The SDK accepts only the first reply, and only
from the parent window. Over the port, it uses
[`@quilted/threads`](https://github.com/lemonmade/quilt/tree/main/packages/threads)
for the calls `@tryghost/app-contracts/bridge` defines, and Admin then calls
`start`. The SDK refuses a call that the connect message didn't list with
`unsupported`, without sending it. Admin only ever adds calls, so an older Admin
lacks the newer ones.

Only an error's message survives the channel, so Admin puts the code at the
start of the message, as in `blocked: Apps can't use /db/`. The SDK splits it
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
what the form or link loaded. The old document's session ends with it. A new
document must connect within the same 10 seconds, or Admin reloads the app's
page. A page that keeps reloading or navigating away within a few seconds of
starting is shown as not responding.

## Who can frame the page

The SDK talks to whichever window frames the page. It can't know a site's Admin
origin in advance, so if any site can frame the page, any site can fool it: send
it a start context of its choosing, and answer every `fetch` itself. No Ghost
credential is ever in the page. But whatever the publisher types into the page
is exposed, and the app acts on whatever responses it gets.

Serve app pages with a `frame-ancestors` Content Security Policy that names the
Ghost Admin origins of the sites using the app, so nothing else can frame them:

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
pnpm test    # type-check + unit tests (jsdom, with a fake Admin on a real MessageChannel),
             # which build both afresh to check what they import
pnpm lint    # lint source and tests
```

It follows the [internal package golden path](../README.md), except where it
ships to apps. Its `build` bundles with Vite instead of compiling with `tsc`,
and also writes `dist/`, which is in `files` and in the Nx build outputs. So it
is marked `exempt`.

It uses `@tryghost/app-contracts` for the bridge's message types, limits and
shape checks, so the SDK and Admin apply the same rules to paths, themes and
start contexts. It imports only the contracts' root entry point, which doesn't
load `zod`, and the build inlines what it uses into the SDK, so the contracts
are a dev dependency. `build/index.js` imports only `@quilted/threads`,
`build/index.d.ts` (bundled by `dts-bundle-generator`) imports nothing, and
`dist/` imports nothing at all. `test/bundle.test.ts` checks this on a fresh
build. The build fails if the code imports a Node builtin, which Vite would
otherwise replace with an empty stub.
