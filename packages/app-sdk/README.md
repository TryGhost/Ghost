# @tryghost/app-sdk

A TypeScript SDK for building apps that run inside Ghost Admin.
Use it to work with your site's content, respond to theme changes, and keep
navigation in sync with Admin.

> **In development.** Apps are in private beta and the SDK is pre-alpha. They're
> for experimentation and aren't ready for production use. Expect breaking
> changes to the SDK, manifest format, and APIs. npm's `latest` tag points to
> the newest alpha.

## Get started

You'll need a Ghost site with Apps enabled. Follow the
[getting started guide](https://tryghost.github.io/Apps/getting-started/) or
start from an [example app](https://tryghost.github.io/Apps/examples/).

```sh
pnpm add @tryghost/app-sdk
```

Call `connect()` as early as possible when your app loads. Ghost keeps showing
a loading screen until your app connects.

```ts
import { connect } from '@tryghost/app-sdk';

const ghost = await connect();

const response = await ghost.fetch('/posts/?limit=5');
const { posts } = await response.json();
```

Your app's manifest lists the permissions it needs as `scopes`, and an
Administrator approves them when installing it. Ghost refuses any Admin API
call they don't cover. `ghost.scopes` holds the permission keys your app was
approved for on this site:

```ts
if (ghost.scopes.includes('post:edit')) {
  // Offer editing
}
```

A call Ghost refuses isn't an error: `fetch` resolves with Ghost's `403`
response, and the first error in its body has a `code` that says why:

| Code                 | Ghost refused the call because                                          |
| -------------------- | ----------------------------------------------------------------------- |
| `APP_SCOPE_REQUIRED` | your app wasn't approved for a scope the call needs; the error names it |
| `APP_NOT_ALLOWED`    | no app may call that endpoint, whatever its scopes                      |

```ts
const response = await ghost.fetch('/tags/');
if (response.status === 403) {
  const { errors } = await response.json();
  // errors[0].code === 'APP_SCOPE_REQUIRED'
}
```

`fetch` rejects, with the code `blocked`, when Admin won't send a request at
all. Write each query parameter once, under a plain name: Admin refuses a name
with brackets, such as `include[]=tags`, one that repeats, or one every
JavaScript object already has, such as `constructor`, so write
`include=tags,authors`. Values can hold anything, escaped as usual, but every
`%` must start a valid escape of UTF-8: write a literal `%` as `%25`, as in
`filter=title:~'50%25'`.

## Signing the manifest

Use the Vite plugin (`@tryghost/app-sdk/vite`) to sign your app's manifest
while developing and building, or `pnpm exec ghost-app` to manage keys and
sign from the command line. The [app docs](https://tryghost.github.io/Apps/sdk/#signing-and-your-server)
cover these tools and the backend helper.

## Documentation

- [SDK guide](https://tryghost.github.io/Apps/sdk/): Capabilities and usage
- [API reference](https://tryghost.github.io/Apps/sdk-reference/): Functions and types
- [Deployment](https://tryghost.github.io/Apps/deployment/): Hosting and production setup
- [Security](https://tryghost.github.io/Apps/security/) and [roadmap](https://tryghost.github.io/Apps/roadmap/): Current limitations and planned changes

## Develop the SDK

From this package's directory in the Ghost monorepo:

```sh
pnpm build
pnpm test
pnpm lint
```
