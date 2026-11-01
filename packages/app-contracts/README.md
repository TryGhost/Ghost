# @tryghost/app-contracts

The contracts between Ghost and apps: formats, types and validation shared by
Ghost core and admin

This is an internal workspace package. See the
[internal package golden path](../README.md) for its standing architecture and
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
  "manifest_url": "https://podcast.example.com/ghost-app.json",
  "identity_key": { "kty": "OKP", "crv": "Ed25519", "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo" },
  "backend_key": { "kty": "OKP", "crv": "Ed25519", "x": "H7aU67-okztSJD3-0znkVDiCU-izOI3I851CZX8XDyk" },
  "development": false
}
```

- `id` is chosen by the developer, in reverse-domain style. It names the app: a
  site has at most one current installation per ID. It proves nothing about who
  made the app; `identity_key` does.
- `name`, `description` and `author` are all required. The author's `url` is only
  ever linked to.
- `icon` is drawn on `accent_color`, a six-digit hex colour. It is either
  `{ "name": "audio-lines" }`, one of the icons Admin ships, or
  `{ "url": "/icon.svg" }`, an SVG the app serves, which Ghost shows as an image
  and never inlines. A name Admin does not know is not rejected here; Admin falls
  back to a default icon.
- An app is one origin. Everything Ghost loads from it, the surfaces and an
  icon's `url`, is a path resolved against `manifest_url`, so the origin Ghost
  fetches the manifest from and challenges is the one every surface runs on. A
  URL with its own scheme or host is refused, even the manifest's own. The
  author's `url` is only linked to, so it is absolute and may be anywhere.
- `manifest_url` is the address the signed manifest is served from. A manifest
  read from any other address is refused, so a copy can't pass as the app, and
  the paths resolve to the same URLs wherever the bytes are served.
- `identity_key` and `backend_key` are public Ed25519 keys as JWKs, with exactly
  `kty`, `crv` and `x`. A key that includes its private part `d` is refused, and
  so are two keys that are the same.
- `development` says whether this is a development build, which Admin labels.
  It must be `true` when any URL is on `localhost` or another address of the
  machine itself. A production site may run a development build to test it.
- `surfaces` lists what the app asks for. Only `admin_page` exists today, at
  most once.
- URLs must be `https`. `localhost` and other addresses of the machine itself are
  accepted, over `http` too, only when Ghost runs in development.

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

`ghostUrls` is required and cannot be empty. Nothing Ghost loads from a manifest
may point at the site's own origin or Admin's: a surface there would not be
contained by its sandbox, and an icon there would make Admin request a Ghost URL
of the app's choosing. The author's link is exempt, since Ghost never loads it.

There is no list of allowed origins in the manifest. The only origin that may
talk to Ghost from a surface is the origin of that surface's resolved `url`;
derive it where it is used, with `new URL(surface.url).origin`. Admin treats
everything on that origin as the app: any page there that sends a hello from the
app's frame gets the bridge, including `fetch` as the staff user. So the origin
must serve only the app (the SDK's README lists what to keep off it).

### The manifest URL

`parseManifestUrl(input, allowLocalhost)` applies the same rules to the address a
manifest is read from, so it can run before anything is fetched. It hands back the
address to keep, as the URL parser reads it. An address with a fragment, even an empty
one, is refused, as is a `manifest_url` with one. The parser settles most differences
in spelling, but a trailing dot on the host or the case of a percent-encoding stays as
given, so such an address reads as a change of manifest URL.

```ts
import { parseManifestUrl } from '@tryghost/app-contracts/manifest';

const result = parseManifestUrl(' https://Podcast.Example.com/ghost-app.json#install ', false);

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
//   changes: [{ path: 'surfaces[0].url', requiresApproval: true }],
//   requiresApproval: true,
// }
```

## Identity

`@tryghost/app-contracts/identity` signs and verifies what proves an app is who
it says it is. It loads `jose` and is for servers and an app's tooling only;
Admin never imports it.

### Signed manifests

An app serves its manifest as flattened JWS JSON, signed with its identity key,
which the developer keeps offline. The protected header is exactly
`{"alg":"Ed25519","typ":"ghost-app-manifest","iat":<seconds>}`, and the payload
is the manifest's exact bytes.

`iat` is when it was signed. Ghost keeps the newest it has seen for each
installation and refuses an older one, so a copy of an earlier manifest, with a
backend key since replaced, can't be served again. It is in the header so that
signing the same manifest again keeps its digest. To roll back, sign the older
manifest again: a platform's rollback that serves the old signed file is
refused. Serve the signed manifest with `Cache-Control: no-cache`, so a stale
copy in a cache isn't refused as outdated.

```ts
import {
  readSignedManifest,
  signManifest,
  verifySignedManifest,
} from '@tryghost/app-contracts/identity';

const signed = await signManifest(manifest, identityPrivateKey); // iat: now

const read = readSignedManifest(body);
// Parse read.payload with parseManifest, then:
await verifySignedManifest(read.signed, parsed.manifest.identity_key); // { success: true }
```

The key to verify with is named inside the manifest, so `readSignedManifest`
hands back the payload and `issuedAt` unverified. Nothing in either may be used until
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
(`fetch`, `titleChanged`, `pathChanged`, `open`), and `AppExports` what Admin
calls on the app (`start`, `themeChanged`, `pathChanged`).

The frame is untrusted, so Admin parses every argument with the schemas here
(`FetchRequestSchema`, `AppPathSchema`, `TitleSchema`, `PlaceSchema`, …) before
acting. Nothing is versioned: Admin only adds calls and optional fields, and the
SDK rejects a call the connect doesn't list as `unsupported`, without sending it.

The bridge's rules that have no dependencies live in `src/bridge/rules.ts`, and
the root entry point exports them as well:

- the message types, `START_TIMEOUT_MS`, `TITLE_MAX_LENGTH`, `FETCH_METHODS` and
  the statuses a fetch response may have;
- `isContainedPath`, and `normaliseAppPath`, which returns the one normalised
  form both sides store an app path in, with `..` resolved within the app
  (`AppPathSchema` already returns it, so Admin doesn't need to call it);
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
  `isConnectMessage`, `isFetchResponse`).

The SDK checks what it sends and what Admin sends it with these, without zod.
What Admin sends has no schema, because Admin builds it and never parses it;
what a page sends does, and those schemas build on the same rules, so both
sides read a path, a header or a refusal the same way.

`fetch` takes an Admin API path, never a URL. Admin checks the request with
`checkAdminApiRequest({ path, method, body }, apiRoot)`, which resolves the path
against the Admin API root and returns the URL to request and the scope that
allows it, or `invalid_path` for anything that leaves the root and `blocked`
for anything else it refuses, with a `detail` naming the method and path or
what was refused. `ADMIN_API_ALLOWLIST` lists the routes apps can reach, by
method, under the scope names Permissions and auth will use; its header
comment says what the security review (BER-3992) must look at. Writes of
posts, pages and tags are also checked for code injection and mobiledoc
(`content.ts`). It all stands in for apps' own token.

```ts
import { checkAdminApiRequest } from '@tryghost/app-contracts/bridge';

const root = new URL('https://site.example/ghost/api/admin/');
checkAdminApiRequest({ path: '/posts/?limit=5' }, root);
// { url: …/ghost/api/admin/posts/?limit=5, pathname: '/posts/', scope: { name: 'posts:read', … } }
checkAdminApiRequest({ path: '/../content/' }, root); // { problem: 'invalid_path' }
checkAdminApiRequest({ path: '/db/' }, root);
// { problem: 'blocked', pathname: '/db/', detail: "Apps can't use GET /db/" }
checkAdminApiRequest({ path: '/posts/', method: 'POST', body: '{"posts":[{"codeinjection_head":""}]}' }, root);
// { problem: 'blocked', …, detail: "Apps can't send codeinjection_head to POST /posts/" }
```

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
