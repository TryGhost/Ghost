# Admin X Framework

Shared runtime for Ghost's React admin surfaces: the admin shell (`apps/admin`) and the route-composed ActivityPub app (`apps/activitypub`). It provides the data layer (React Query factories and per-resource API modules), the `FrameworkProvider`/`RouterProvider` pair, and shared hooks.

## Pre-requisites

- Run `pnpm bootstrap` in the Ghost monorepo root

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.

1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm bootstrap` to install the workspace and initialize submodules.

### Source exports

Admin’s Vite development, production and test configurations select the `source`
export condition to load this package directly from `src/`. Changes reach Vite
without waiting for the library build. Consumers without that condition keep
using the compiled exports; TypeScript continues using the generated declarations.
The library build remains required for those consumers.

### Admin theme controller

`utils/admin-theme` provides the framework-independent appearance controller used
by React Admin. It owns the root dark class, system
appearance listener and transition suppression. An optional adapter can prepare
legacy styles and receive the resolved theme. Destroy a controller before handing
ownership to another shell; pending stylesheet work cannot apply after destruction.

## Test

- `pnpm lint` - run just eslint
- `pnpm test` - runs type checks and unit tests

In package.json you can find other related running options too.
