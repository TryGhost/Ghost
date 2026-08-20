# Admin X Framework

Shared runtime for Ghost's React admin apps: the admin shell (`apps/admin`) and the route-composed ActivityPub app (`apps/activitypub`). It provides the data layer (React Query factories and per-resource API modules), the `FrameworkProvider`/`RouterProvider` pair, and shared hooks.

## Pre-requisites

- Run `pnpm` in Ghost monorepo root

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm` to install top-level dependencies.

## Test

- `pnpm lint` - run just eslint
- `pnpm test` - runs unit tests

In package.json you can find other related running options too.
