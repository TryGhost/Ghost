# @tryghost/app-sdk

The SDK apps use to talk to Ghost from inside Admin.

An app's page runs in a frame inside Ghost Admin. The SDK connects it to Admin,
tells it about the site, the user and the theme, and lets it call the Admin API,
follow Admin's address and send the publisher elsewhere in Admin.

> **Unreleased.** The package is `private` and not on npm yet; the pre-release
> removes that. Until then, use it from a Ghost checkout through a `file:` link,
> or load its browser bundle.

## Quick start

Without a bundler, load the bundle, one ES module with everything inlined
(`dist/app-sdk.js`, built by `pnpm build`):

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

With a bundler:

```json
{ "dependencies": { "@tryghost/app-sdk": "file:../Ghost/packages/app-sdk" } }
```

```ts
import { connect, GhostAppError } from '@tryghost/app-sdk';

try {
  const ghost = await connect();
  await ghost.path.set('/episodes/12'); // the app routed itself; Admin's address follows
} catch (error) {
  if (error instanceof GhostAppError && error.code === 'not_framed') {
    // Opened outside Admin: show a link to the site's Admin instead.
  }
}
```

## API

`connect(options?)` resolves with a `Ghost` once Admin has started the app.
Call it as soon as the page loads; every call shares one connection.
`options.timeout` is how long to wait, in milliseconds (10 seconds by default).

| `Ghost`                       | What it is                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `site`                        | `{ url, title, timezone, locale }`                                                                                                          |
| `user`                        | `{ id, role }` of the staff user. No name or email: ask the Admin API, where permissions apply.                                             |
| `theme`                       | `{ mode, accent_color }` Admin shows now. `mode` is `light` or `dark`, never `system`.                                                      |
| `onThemeChange(callback)`     | Called with the new theme when the publisher switches. Returns a function that unsubscribes.                                                |
| `session`                     | `{ revision }`: the installation revision the session started against.                                                                      |
| `path.current`                | The app's own route, such as `/episodes/12`, from Admin's address. `/` when it names none.                                                  |
| `path.set(path, { replace })` | Tells Admin the app moved to another of its routes, so the address bar, reloads and the back button follow. It does not navigate the page.  |
| `onPathChange(callback)`      | Called when Admin's address moves within the app: back, forward, a link. Not for the app's own `path.set`.                                  |
| `fetch(path, init?)`          | Calls the Admin API as the staff user. `path` is relative to the API root (`/posts/?limit=5`), never a URL. Answers with a real `Response`. |
| `open(place)`                 | Sends the publisher to `{ post: { id } }`, `{ page: { id } }`, `{ member: { id } }` or `{ apps: true }`.                                    |
| `connected`                   | `false` once the session has ended.                                                                                                         |
| `onSessionEnd(callback)`      | Called once, with the `session_ended` error, when the session ends.                                                                         |

`fetch` takes `method` (any case), `headers` (anything `Headers` takes) and
`body`: text is sent as it is; an object or array is sent as JSON, with
`content-type: application/json` unless the app set one. A body on `GET` or
`HEAD`, or a binary body, is refused. Any status comes back as a `Response`;
`fetch` rejects only when Admin refuses to make the request.

The page's title is reported for you: the SDK watches `<title>` and Admin shows
it, up to 200 characters, while the page is open.

## Errors

Everything rejects with a `GhostAppError`, whose `code` says why:

| `code`             | Means                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `not_framed`       | The page is not inside a frame, so there is no Admin to talk to.                                            |
| `not_connected`    | Admin did not start the app before the timeout.                                                             |
| `session_ended`    | The channel to Admin has closed, usually because Admin is reloading the app. Every call fails from then on. |
| `invalid_argument` | The app passed something that cannot be sent, such as a body on a `GET`.                                    |
| `invalid_path`     | A URL, or a path that leaves the Admin API, given to `fetch`; or a bad route for `path.set`.                |
| `unsupported`      | This site's Ghost is older than the call. The message names it.                                             |
| `blocked`          | An Admin API route apps may not reach, such as `/db/` or `/integrations/`.                                  |
| `network_error`    | Admin could not reach its own API.                                                                          |
| `rejected`         | Admin refused for another reason; the message says why.                                                     |

## How it connects

The SDK posts `{ type: 'ghost-app:hello', sdk: <version> }` to `window.parent`
every 250 ms until Admin answers with `ghost-app:connect` and a `MessagePort`.
It takes only the first answer, and only from the parent window. Over the port
it uses [`@quilted/threads`](https://github.com/lemonmade/quilt/tree/main/packages/threads)
for the calls `@tryghost/app-contracts/bridge` defines; Admin then calls `start`.

Only an error's message survives the channel, so Admin leads it with the code,
as in `blocked: Apps can't use /db/`; the SDK reads it back into `code` and
`message`. A message without a known code arrives as `rejected`.

The session ends when the port closes (in browsers that report it, such as
Chromium), when a message on it cannot be read, or when Admin refuses a call
with `session_ended`, which it does to every pending call as it lets go of the
app. Elsewhere, a page Admin has let go of is removed with its frame.

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # tsc to build/, then the browser bundle to dist/ with Vite
pnpm test    # type-check + unit tests (jsdom, with a fake Admin on a real MessageChannel)
pnpm lint    # lint source and tests
```

It follows the [internal package golden path](../README.md) except where it ships
to browsers: its `build` also writes `dist/`, which is in `files` and in the Nx
build outputs, so it is marked `exempt`.

It depends on `@tryghost/app-contracts` at runtime, for the bridge's message
types, limits and shape checks, so the SDK and Admin read paths, themes and
start contexts by the same rules. It imports only the contracts' root entry
point, which loads no `zod`. `build/` imports it; `dist/` inlines what it uses,
so the bundle imports nothing.
