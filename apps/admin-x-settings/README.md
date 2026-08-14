# Admin X Settings

Ghost Admin Settings micro-frontend.

## Pre-requisites

- Run `pnpm` in Ghost monorepo root

## Running the app

Run `pnpm dev` from the top-level repo. This starts all frontend apps via Docker backend + host dev servers, and AdminX will automatically rebuild when you make changes.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm` to install top-level dependencies.

## Test

- `pnpm lint` - run just eslint
- `pnpm test:unit` - runs unit tests
