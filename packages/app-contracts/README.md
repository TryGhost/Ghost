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

| Entry point                        | What it holds                            |
| ---------------------------------- | ---------------------------------------- |
| `@tryghost/app-contracts`          | Types, and limits that depend on nothing |
| `@tryghost/app-contracts/manifest` | The app manifest and its validation      |

The root entry point must stay free of `zod`: some consumers ship to browsers
that never validate anything. A lint rule enforces it.

A new contract, such as the bridge between admin and an app's page, gets its own
folder under `src/` and its own entry point.

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
  result.manifestUrl; // the manifest's URL as it was checked, which is the one to keep
} else {
  result.errors; // [{ path: 'surfaces[0].url', message: '…' }]
}
```

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

`checkManifestUrl(url, allowLocalhost)` applies the same rules to the address a
manifest is read from, so it can run before anything is fetched.

### Comparing manifests

`compareManifests(approved, next)` lists every field that differs between two
parsed manifests, and whether each change needs the publisher to approve it
again. Only `description`, `accent_color` and `icon.name` change silently.
Everything else says who the app is or is a URL Ghost loads or links to, so it
needs approval, and so does any field added to the manifest later until it is
listed as silent.

```ts
compareManifests(approved, next);
// {
//   changes: [{ path: 'surfaces[0].url', requiresApproval: true }],
//   requiresApproval: true,
// }
```

## Develop

This is a workspace package in the Ghost monorepo. From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
