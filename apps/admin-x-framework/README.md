# Admin X Framework

Shared runtime for Ghost's React admin surfaces: the admin shell (`apps/admin`), the route-composed ActivityPub app (`apps/activitypub`), and the Koenig editor embedded in Ember Admin (`apps/ember-admin`). It provides the data layer (React Query factories and per-resource API modules), the `FrameworkProvider`/`RouterProvider` pair, and shared hooks.

## Pre-requisites

- Run `pnpm setup` in the Ghost monorepo root

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm setup` to install the workspace and initialize submodules.

## Test

- `pnpm lint` - run just eslint
- `pnpm test` - runs type checks and unit tests

In package.json you can find other related running options too.
