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
