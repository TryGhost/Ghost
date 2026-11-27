# @tryghost/app-contracts

The contracts between Ghost and apps: formats, types and validation shared by
Ghost core and admin

This is an internal workspace package. See the
[internal package golden path](../../packages/README.md) for its standing architecture and
maintenance rules.

Apps run on their developer's own servers and show up inside Ghost. Everything
the two sides have to agree on is defined here, once, so Ghost core, admin and
the app SDK cannot disagree about it. The package holds formats, types and
validation only: nothing here fetches, stores or renders anything.

## Entry points

Each contract is its own entry point, so a consumer only loads the one it uses.

| Entry point                        | What it holds                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `@tryghost/app-contracts`          | Types, and rules and limits that depend on nothing (`isLocalhost`, `isContainedPath`) |
| `@tryghost/app-contracts/manifest` | The app manifest and its validation                                                   |
| `@tryghost/app-contracts/bridge`   | The channel between Admin and an app's page, and its validation                       |
| `@tryghost/app-contracts/identity` | Signing and verifying signed manifests and challenges, for servers only               |

The root entry point must stay free of `zod`: some consumers ship to browsers
that never validate anything. A lint rule enforces it.

A new contract, such as cards, gets its own folder under `src/` and its own
entry point.

## The manifest

An app describes itself to Ghost in a JSON manifest, which it serves as a
[signed manifest](#identity):

```json
{
  "id": "com.example.podcast",
  "name": "Podcast",
  "description": "Publish episodes and embed players.",
  "author": { "name": "Example Audio", "url": "https://example.com" },
  "accent_color": "#ff5500",
  "icon": { "name": "audio-lines" },
  "surfaces": [{ "type": "admin_page", "url": "/admin" }],
  "scopes": ["post:browse", "post:edit"],
  "manifest_url": "https://podcast.example.com/ghost-app.json",
  "identity_key": { "kty": "OKP", "crv": "Ed25519", "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo" },
  "backend_key": { "kty": "OKP", "crv": "Ed25519", "x": "H7aU67-okztSJD3-0znkVDiCU-izOI3I851CZX8XDyk" },
  "development": false
}
```

- `id` is chosen by the developer, in reverse-domain style. It names the app: a
  site has at most one current installation per ID. It proves nothing about who
  made the app; `identity_key` does.
- `name`, `description` and `author` are all required. The author's `url` is
  where publishers reach the developer for support: a web page, held to the
  same rules as the manifest's other URLs, or a `mailto:` link to one address,
  with no query or fragment. It is only ever linked to, and nothing checks who
  the author is, so Admin's install review and app details mark them as an
  unverified developer.
- Text is one line of plain text. Characters that show nothing, as a reader sees
  them, are taken off both ends, such as spaces, Hangul fillers and the blank
  Braille pattern standing alone, with any marks on them. Text with nothing
  visible left is refused.
- `icon` is drawn on `accent_color`, a six-digit hex colour. It is either
  `{ "name": "audio-lines" }`, one of the icons Admin ships, or
  `{ "url": "/icon.svg" }`, an image the app serves: SVG, PNG or WebP,
  at most 16 KB. Ghost keeps a copy of the image with each manifest
  version it stores, and only shows that copy, as an image. Admin draws it in a
  single colour, like the icons it ships, keeping only the shape of its opaque
  pixels, so draw a glyph on a transparent background. JPEG and GIF are
  refused. An image replaced at
  the same URL shows the next time the manifest changes, even by a field that
  needs no approval. A name Admin does not know is not rejected here;
  Admin falls back to a default icon.
- An app is one origin. Everything Ghost loads from it, the surfaces and an
  icon's `url`, is a path resolved against `manifest_url`, so the origin Ghost
  fetches the manifest from and challenges is the one every surface runs on. A
  URL with its own scheme or host is refused, even the manifest's own. The
  author's `url` is only linked to, so it is absolute and may be anywhere.
- `manifest_url` is the address Ghost was asked to fetch the signed manifest
  from. A manifest naming any other address is refused, so a copy can't pass as
  the app, and the paths resolve to the same URLs wherever the bytes are served.
  Ghost follows a redirect to another path on the same host, and the manifest
  still names the address Ghost was asked for.
- `identity_key` and `backend_key` are public Ed25519 keys as JWKs, with exactly
  `kty`, `crv` and `x`. A key that includes its private part `d` is refused, and
  so are two keys that are the same.
- `development` says whether this is a development build, which Admin labels.
  It must be `true` when any URL is on `localhost` or another address of the
  machine itself. A production site may run a development build to test it.
- `surfaces` lists what the app asks for. Only `admin_page` exists today, at
  most once.
- `scopes` lists the permission keys the app needs from the site, such as
  `["post:browse", "post:edit"]`; `[]` asks for nothing. The scope registry,
  `src/scopes.ts`, is the one list of scopes Ghost knows and the words Admin
  shows for them; the field's exact rules are in
  `src/manifest/scopes-schema.ts` and its tests.
- URLs must be `https`. `localhost` and other addresses of the machine itself are
  accepted, over `http` too, only when Ghost runs in development. The manifest
  still can't be on Ghost's own host, on any port: serve the app from a name of
  its own under `.localhost`, such as `my-app.localhost`. Browsers send such
  names to the machine itself, and so does Ghost in development, even where the
  system's resolver doesn't know them.

The format is unversioned while only Ghost builds apps. Unknown fields are
rejected, so adding one is always a deliberate change to `src/manifest/`.

## Usage

```ts
import { parseManifest } from '@tryghost/app-contracts/manifest';

const result = parseManifest(json, {
  manifestUrl: 'https://podcast.example.com/ghost-app.json',
  ghostUrls: ['https://site.example.com', 'https://admin.example.com'],
  allowLocalhost: false,
});

if (result.success) {
  result.manifest.surfaces[0].url; // https://podcast.example.com/admin
} else {
  result.errors; // [{ path: 'surfaces[0].url', message: '…' }]
}
```

`manifestUrl` is the address Ghost was asked to fetch the manifest from, before any
redirects. The paths inside the manifest resolve against it, and the manifest must
name it as its `manifest_url`; one that names another address fails with
`reason: 'manifest_url_mismatch'`, any other problem with `reason: 'invalid'`.

`parseManifest` is for a manifest as an app serves it. A manifest it has accepted is
read back, from a database say, with `AppManifestSchema`: the same shape, with every
URL absolute and none of them resolved or checked again, so a manifest accepted before
the site's URL changed still reads. It encodes too, so what is stored is what will be
read:

```ts
import { z } from 'zod';
import { AppManifestSchema } from '@tryghost/app-contracts/manifest';

const stored = JSON.stringify(z.encode(AppManifestSchema, result.manifest));
const manifest = AppManifestSchema.parse(JSON.parse(stored));
```

`ghostUrls` is required and cannot be empty. The manifest may not be on the
site's host or Admin's, whatever the port or scheme, and so neither may anything
Ghost loads from it, as that is on the manifest's origin. A surface on Ghost's
origin would not be contained by its sandbox, and on another port it would be
sent the staff user's session cookie, as cookies ignore ports. An icon there
would let the app make Ghost request any of the site's own URLs. Hosts are
compared as the URL parser reads them, without a trailing dot. A sibling host,
such as another subdomain, is not Ghost's, nor is a name under Ghost's or
another name for the same machine: `my-app.localhost` or `127.0.0.1` next to
Ghost on `localhost` is fine. Anything Ghost loads
must also have a path, query and fragment `isContainedPath` accepts, as Admin
opens the app there: not one starting with `//`, as `/.//admin` resolves to, nor
one with a `\` in the query or fragment. The author's link is exempt from both,
since Ghost never loads it. `isGhostHost` applies the host rule on its own, for
Admin to ask again before it frames a page.

There is no list of allowed origins in the manifest. The only origin that may
talk to Ghost from a surface is the origin of that surface's resolved `url`;
derive it where it is used, with `new URL(surface.url).origin`. Admin treats
everything on that origin as the app: any page there that sends a hello from the
app's frame gets the bridge, including `fetch` as the staff user. So the origin
must serve only the app (the SDK's README lists what to keep off it).

### The manifest URL

`parseManifestUrl(input, { ghostUrls, allowLocalhost })` applies the same rules to
the address a manifest is read from, Ghost's hosts included, so it can run before
anything is fetched. It hands back the
address to keep, as the URL parser reads it. An address with a fragment, even an empty
one, is refused, as is a `manifest_url` with one. The parser settles most differences
in spelling, but a trailing dot on the host or the case of a percent-encoding stays as
given, so such an address reads as a change of manifest URL.

```ts
import { parseManifestUrl } from '@tryghost/app-contracts/manifest';

const result = parseManifestUrl(' https://Podcast.Example.com/ghost-app.json ', {
  ghostUrls: ['https://site.example.com', 'https://admin.example.com'],
});

if (result.success) {
  result.manifestUrl; // https://podcast.example.com/ghost-app.json
} else {
  result.error; // 'Expected an https URL for the manifest itself'
}
```

### Comparing manifests

`compareManifests(approved, next)` lists every field that differs between two
parsed manifests, and whether each change needs the publisher to approve it
again. Only `description`, `accent_color`, `icon.name` and `backend_key` change
silently: the identity key vouches for the backend key, so a leaked one can be
replaced without every site approving it. Everything else says who the app is
or is a URL Ghost loads or links to, so it needs approval, and so does any
field added to the manifest later until it is listed as silent. That includes
`manifest_url`, which decides what future updates say.

```ts
compareManifests(approved, next);
// {
//   changes: [{ kind: 'field', path: 'surfaces[0].url', requires_approval: true }],
//   requiresApproval: true,
// }
```

Each change has a `kind`: a `field` by its path, or one `scope`.
`ManifestChangeSchema`, from `/manifest`, reads a stored change back, and the
root entry point tells them apart without zod: `isFieldChange`,
`isScopeChange` and `splitChanges`.

Scopes are compared by meaning, not field by field. Adding a scope needs
approval; removing one applies at once, and reordering them changes nothing.
At install every scope counts as added. `approvedScopes` gives the scopes an
approval grants, and `describeScopes` words scopes the way the review screen
shows them.

## Identity

`@tryghost/app-contracts/identity` signs and verifies what proves an app is who
it says it is. It loads `jose` and is for servers and an app's tooling only;
Admin never imports it.

### Signed manifests

An app serves its manifest as flattened JWS JSON, signed with its identity key,
which the developer keeps offline. The protected header is exactly
`{"alg":"Ed25519","typ":"ghost-app-manifest"}`, and the payload is the
manifest's exact bytes.

When a manifest names a new backend key, Ghost retires the one it replaced for
that app and identity key, and refuses any manifest that names it again, even
after the app is uninstalled and installed again. So replacing a leaked backend
key revokes it on every site that sees the new manifest. A platform's rollback
to an earlier deployment keeps working, unless it goes back past a new backend
key.

```ts
import {
  readSignedManifest,
  signManifest,
  verifySignedManifest,
} from '@tryghost/app-contracts/identity';

const signed = await signManifest(manifest, identityPrivateKey);

const read = readSignedManifest(body);
// Parse read.payload with parseManifest, then:
await verifySignedManifest(read.signed, parsed.manifest.identity_key); // { success: true }
```

The key to verify with is named inside the manifest, so `readSignedManifest`
hands back the payload unverified. Nothing in it may be used until
`verifySignedManifest` has passed with the manifest's own `identity_key`.

`thumbprintOf(key)` is a key's RFC 7638 thumbprint, the same however its JWK is
written, for storing a key to recognise it again.

### Challenges

A challenge asks an origin to prove it holds the app's backend key. Ghost posts
`createChallenge(origin)`, the JSON `{purpose, origin, nonce}` with a nonce of
32 random bytes, to `challengeUrl(origin)`
(`/.well-known/ghost-app/challenge`). The backend answers
`{"signature": "<compact JWS>"}`, whose payload is the exact bytes it received,
signed with its backend key. Its protected header is exactly `{"alg":"Ed25519"}`.

```ts
// The app's backend:
const result = await answerChallenge(body, {
  backendKey: backendPrivateKey,
  requestUrl: request.url, // as the platform reports it
});

// Ghost:
await verifyChallengeAnswer(challenge, answerText, manifest.backend_key); // { success: true }
```

`answerChallenge` refuses a challenge for any origin but the one the request
arrived at. Pass the URL the platform reports, never one built from
`X-Forwarded-Host` or another header the sender sets. Whoever takes over a name
the app used to serve then can't relay Ghost's challenge for it to the real
backend. Ghost can't see this check, so it only helps on platforms that route
requests by host (Workers, Vercel, Netlify, Fly); a server that answers for any
host gains nothing from it.

## The bridge

Admin frames an app's page and talks to it over a `MessagePort`. The page's SDK
posts a `ghost-app:hello` to `window.parent`, with an ID for its document
(random, made when the SDK loads); Admin checks the sender is the frame and its origin
is the surface's, and answers with a `ghost-app:connect` carrying the port and
the names of the calls it exports. The ID lets Admin tell whether a hello comes
from a document it already connected or from a new document. Over the port,
each side exposes named calls: `HostExports` are what an app may call on Admin
(`fetch`, `titleChanged`, `pathChanged`, `open`, `overlayShown`,
`overlayHidden`), and `AppExports` what Admin calls on the app (`start`,
`themeChanged`, `pathChanged`, `layoutChanged`, `overlayDismissed`).

The frame is untrusted, so Admin parses every argument with the schemas here
(`FetchRequestSchema`, `AppPathSchema`, `TitleSchema`, `PlaceSchema`, …) before
acting. Nothing is versioned: Admin only adds calls and optional fields, and the
SDK rejects a call the connect doesn't list as `unsupported`, without sending it.

The bridge's rules that have no dependencies live in `src/bridge/rules.ts`, and
the root entry point exports them as well:

- the message types, `START_TIMEOUT_MS`, `TITLE_MAX_LENGTH`, `FETCH_METHODS` and
  the statuses a fetch response may have;
- `isContainedPath`, and `normaliseAppPath`, which returns the one normalised
  form both sides store an app path in, with `..` resolved within the app.
  Resolving `.` and `..` can leave a contained path starting with `//`, such as
  `/.//host`, so check the result with `isContainedPath` before resolving it
  against anything (`AppPathSchema` does both);
- `isReservedRequestHeader` for the headers only Admin sets,
  `isJsonContentType` for the one content type a body may have,
  `methodAllowsBody`, and the messages both sides refuse an argument with
  (`ARGUMENT_MESSAGES`);
- the codes a refused call carries, written and read as `code: detail` by
  `encodeBridgeError` and `decodeBridgeError`: `HOST_ERROR_CODES` are those Admin
  refuses the page's calls with, `APP_ERROR_CODES` (`invalid_context` and
  `invalid_argument`) those the page refuses Admin's with, and
  `BRIDGE_ERROR_CODES` all of them;
- the shapes Admin sends the page, `Theme`, `StartContext`, `ConnectMessage`
  and `FetchResponse`, with a guard for each (`isTheme`, `isStartContext`,
  `isConnectMessage`, `isFetchResponse`). The start context carries the
  installation's approved `scopes`, so an app knows what Ghost will let it
  call.

The SDK checks what it sends and what Admin sends it with these, without zod.
What Admin sends has no schema, because Admin builds it and never parses it;
what a page sends does, and those schemas build on the same rules, so both
sides read a path, a header or a refusal the same way.

`fetch` takes an Admin API path, never a URL, and Admin sends it with the app
session's token. Ghost's server decides what an app may call: it holds the
token to the installation's approved scopes and refuses every route no scope
covers, so Admin sends any path within the API and the app gets the server's
answer. The one exception is `GET /site`, the site's public details, which
anyone may read without signing in, so every app reaches it whatever its
scopes. Ghost refuses an app with a 403 whose first error has a code of its
own:

| Code                 | Ghost refused the call because                                         |
| -------------------- | ---------------------------------------------------------------------- |
| `APP_SCOPE_REQUIRED` | the app wasn't approved for a scope the call needs; the error names it |
| `APP_NOT_ALLOWED`    | no app may call the endpoint, whatever its scopes                      |

A refusal because the staff user's role doesn't allow the call has no code,
and a refused token is `401 APP_TOKEN_INVALID`, which Admin handles by
renewing the token.

`APP_ROUTES` in `src/bridge/app-routes.ts` is the reviewed list of the routes
each scope opens to an app, with what the bridge still covers on each. Opening
a route to apps is one edit there.

What the server doesn't check yet, Admin still does, with
`checkAdminApiRequest({ path, method, body }, apiRoot, approvedScopes)`, which
returns the URL to request, or the reason it refused. `SERVER_GAPS` in
`src/bridge/server-gaps.ts` holds each gap as one unit, with the issue that
moves it to the server and its own check or rewrite of the request: the
parameters that email a post or take HTML as its content, those that
re-render a post or convert it to Lexical, code injection and mobiledoc in a
write, bulk edit of posts and pages, copying a post or page,
and the scopes a post's includes and sorts need. Every gap `APP_ROUTES` names
for a route is applied, in order, and a refusal names the gap that made it.

A gap only holds if the server reads the request as the bridge did, and query
parsers disagree: Ghost's reads `include[]`, `[include]` and `%69nclude` as
`include`, splits a part at `]=` before `=`, and makes a list of a name that
repeats, none of which a URL parser does. So the bridge never sends a query as
the app spelled it. `readQuery` in `src/bridge/query.ts` reads it strictly,
and the bridge sends one it wrote itself, `name=value` for each parameter with
the value escaped whole. It refuses, as `blocked`, a query it can't write so
that every parser reads the same:

- a parameter name that isn't plain word characters (letters, digits, `_`), so
  no brackets, raw or escaped, and no escapes in a name at all;
- a name that repeats;
- a value with a malformed escape;
- more than `QUERY_PARAMETER_LIMIT` (100) parameters, where Ghost reads 1,000
  and drops the rest without an error.

Values are free: brackets, colons, commas and anything else a filter needs.

On a post or page request that names no `include`, the bridge names the
includes the app may have, as Ghost's own defaults include how a post
performed. It does so whatever `fields` says: Ghost honours `fields` only on a
read, and only when it reads it as a list, so a write that sends it gets
Ghost's defaults. A read that asks for some `fields` comes back with those
fields and the relations the bridge named.

Four tests in Ghost keep this honest:

- `ghost/test/unit/server/web/api/admin/app-routes.test.ts` holds `APP_ROUTES`
  to the routes Ghost opens under each scope's key, in both directions, and to
  how Ghost's router matches a path.
- `ghost/test/unit/server/web/api/admin/app-bridge-query.test.ts` shows every
  spelling of a query is either refused by the bridge or read by the parser
  Ghost's Express apps are set up with as exactly the parameters the bridge
  held.
- `ghost/test/e2e-api/admin/app-server-gaps.test.ts` sends what each gap acts
  on twice, with a real token: through `checkAdminApiRequest`, which must
  refuse or rewrite it by that gap, and as written to the server, which must
  still accept it. When the server stops, it has taken the check over: delete
  the gap. A gap without a test there doesn't compile.
- `ghost/test/e2e-api/admin/app-bridge-requests.test.ts` sends requests
  through `checkAdminApiRequest` and on to the Admin API with a real token, and
  fails when an answer holds something the app has no scope for.

```ts
import { checkAdminApiRequest } from '@tryghost/app-contracts/bridge';

const root = new URL('https://site.example/ghost/api/admin/');
const approved = new Set(['post:browse', 'post:add']);
checkAdminApiRequest({ path: '/posts/?limit=5&filter=tag:news' }, root, approved);
// { url: …/ghost/api/admin/posts/?limit=5&filter=tag%3Anews&include=authors, pathname: '/posts/', gaps: ['postFields'] }
checkAdminApiRequest({ path: '/../content/' }, root, approved); // { problem: 'invalid_path' }
checkAdminApiRequest({ path: '/db/' }, root, approved);
// { url: …/ghost/api/admin/db/, pathname: '/db/', gaps: [] }, which Ghost answers with a 403 APP_NOT_ALLOWED
checkAdminApiRequest({ path: '/posts/?include[]=tags' }, root, approved);
// { problem: 'blocked', pathname: '/posts/', detail: "Apps can't send a query parameter named include[]: …" }
checkAdminApiRequest({ path: '/posts/', method: 'POST', body: '{"posts":[{"codeinjection_head":""}]}' }, root, approved);
// { problem: 'blocked', …, gap: 'scriptInContent', detail: "Apps can't send codeinjection_head to POST /posts/" }
```

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
