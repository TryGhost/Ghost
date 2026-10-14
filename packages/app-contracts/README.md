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

The root entry point must stay free of `zod`: some consumers ship to browsers
that never validate anything. A lint rule enforces it.

A new contract, such as cards, gets its own folder under `src/` and its own
entry point.

## The manifest

An app describes itself to Ghost in a JSON manifest served next to the app:

```json
{
  "id": "com.example.podcast",
  "name": "Podcast",
  "description": "Publish episodes and embed players.",
  "author": { "name": "Example Audio", "url": "https://example.com" },
  "accent_color": "#ff5500",
  "icon": { "name": "audio-lines" },
  "surfaces": [{ "type": "admin_page", "url": "/admin" }]
}
```

- `id` is chosen by the developer, in reverse-domain style. It is the app's
  identity: it stays the same wherever the app is served from.
- `name`, `description` and `author` are all required. The author's `url` is only
  ever linked to.
- `icon` is drawn on `accent_color`, a six-digit hex colour. It is either
  `{ "name": "audio-lines" }`, one of the icons Admin ships, or
  `{ "url": "/icon.svg" }`, an SVG the app serves, which Ghost shows as an image
  and never inlines. A name Admin does not know is not rejected here; Admin falls
  back to a default icon.
- URLs may be relative. They resolve against the URL the manifest was fetched
  from, so one manifest works on `localhost`, behind a tunnel and in production.
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

`manifestUrl` is where the manifest was fetched from, after any redirects, so its
relative URLs resolve as they would in a browser. It is checked by the same rules as
the URLs inside the manifest.

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
derive it where it is used, with `new URL(surface.url).origin`.

### The manifest URL

`parseManifestUrl(input, allowLocalhost)` applies the same rules to the address a
manifest is read from, so it can run before anything is fetched. It hands back the
address to keep, as the URL parser reads it and without a fragment, which never reaches
the server. The parser settles most differences in spelling, but a trailing dot on the
host or the case of a percent-encoding stays as given, so such an address reads as a
change of manifest URL.

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
versions of a manifest, each a parsed manifest with the address it was read
from, and whether each change needs the publisher to approve it again. Only
`description`, `accent_color` and `icon.name` change silently. Everything else
says who the app is or is a URL Ghost loads or links to, so it needs approval,
and so does any field added to the manifest later until it is listed as silent.
A change of address is listed first, as `manifest_url`, and always needs
approval: it decides what future updates say.

```ts
compareManifests(
  { manifestUrl: 'https://podcast.example.com/ghost-app.json', manifest: approved },
  { manifestUrl: 'https://podcast.example.com/ghost-app.json', manifest: next },
);
// {
//   changes: [{ path: 'surfaces[0].url', requiresApproval: true }],
//   requiresApproval: true,
// }
```

## The bridge

Admin frames an app's page and talks to it over a `MessagePort`. The page's SDK
posts a `ghost-app:hello` to `window.parent`, with a random ID for its
document; Admin checks the sender is the frame and its origin is the surface's,
and answers with a `ghost-app:connect` carrying the port. The ID tells a hello
repeated by a document Admin has connected from a new document's. Over it,
each side exposes named calls: `HostExports` are what an app may ask of Admin
(`fetch`, `titleChanged`, `pathChanged`, `open`), `AppExports` what Admin tells
the app (`start`, `themeChanged`, `pathChanged`).

The frame is untrusted, so Admin parses every argument with the schemas here
(`FetchRequestSchema`, `AppPathSchema`, `TitleSchema`, `PlaceSchema`, …) before
acting. Nothing is versioned: Admin only adds calls and optional fields.

The bridge's rules that depend on nothing live in `src/bridge/rules.ts` and are
exported from the root entry point as well:

- the message types, `START_TIMEOUT_MS`, `TITLE_MAX_LENGTH`, `FETCH_METHODS` and
  the statuses a fetch answer may have;
- `isContainedPath`, and `normaliseAppPath`, the one spelling both sides keep an
  app path in, with `..` resolved within the app;
- `isReservedRequestHeader` for the headers only Admin sets,
  `methodAllowsBody`, and the words both sides refuse an argument with
  (`ARGUMENT_MESSAGES`);
- the codes a refused call carries, written and read as `code: detail` by
  `encodeBridgeError` and `decodeBridgeError`: `HOST_ERROR_CODES` are those Admin
  refuses the page's calls with, and `BRIDGE_ERROR_CODES` adds `invalid_context`,
  which only the page sends, refusing a start context it cannot read;
- the shapes Admin sends the page, `Theme`, `StartContext`, `ConnectMessage`
  and `FetchResponse`, with a guard for each (`isTheme`, `isStartContext`,
  `isConnectMessage`, `isFetchResponse`).

The SDK checks what it sends and what Admin sends it with these, without zod.
What Admin sends has no schema, as Admin builds it and never parses it; what a
page sends does, and those schemas build on the same rules, so both sides read
a path, a header or a refusal the same way.

`fetch` takes an Admin API path, never a URL. Admin checks it with
`checkAdminApiPath(path, apiRoot)`, which resolves it against the Admin API root
and answers with the URL to request, or with `invalid_path` for anything that
leaves the root and `blocked` for what the blocklist closes: the routes that
hand out credentials, change who can sign in or read a private site, send site
events elsewhere, or import, export or delete the whole site. `ADMIN_API_BLOCKLIST` lists them by
category, each with its reason. It is a stopgap until apps have their own
token, and its header names what it leaves open for the security review
(BER-3992).

```ts
import { checkAdminApiPath } from '@tryghost/app-contracts/bridge';

const root = new URL('https://site.example/ghost/api/admin/');
checkAdminApiPath('/posts/?limit=5', root); // { url: …/ghost/api/admin/posts/?limit=5, pathname: '/posts/' }
checkAdminApiPath('/../content/', root); // { problem: 'invalid_path' }
checkAdminApiPath('/db/', root); // { problem: 'blocked', pathname: '/db/' }
```

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
