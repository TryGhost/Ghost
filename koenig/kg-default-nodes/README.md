# Koenig Default Nodes

Lexical node definitions for the default nodes used in Ghost&#39;s Koenig editor

## Install

`npm install @tryghost/kg-default-nodes --save`

or

`yarn add @tryghost/kg-default-nodes`

## Usage


## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.



## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests


## Running in Ghost Admin
In order to run local changes, perform the following:
1. Run `yarn link` within `kg-default-nodes`
2. Run `yarn link @tryghost/kg-default-nodes` within `ghost/core`

`kg-lexical-html-renderer` must also be linked when linking this package as they are codependencies.


# Copyright & License 

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).