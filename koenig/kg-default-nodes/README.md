# Koenig Default Nodes

Lexical node definitions for the default nodes used in Ghost&#39;s Koenig editor

## Install

`npm install @tryghost/kg-default-nodes --save`

or

`npm install @tryghost/kg-default-nodes`

## Usage


## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `pnpm install` from the Ghost monorepo root.



## Test

- `pnpm lint` run just eslint
- `pnpm test` run lint and tests


## Running in Ghost Admin
In order to run local changes, perform the following:
This package is part of the Ghost monorepo workspace — `ghost/core` resolves
it via `workspace:` automatically, so local changes are picked up with no
linking. Run `pnpm dev` in this package for a rebuild-on-change watcher.

`kg-lexical-html-renderer` must also be linked when linking this package as they are codependencies.


# Copyright & License 

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).