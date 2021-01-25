# Zip

## Install

`npm install @tryghost/zip --save`

or

`yarn add @tryghost/zip`


## Usage

```
const zip = require('@tryghost/zip');

// Create a zip from a folder

let res = await zip.compress('path/to/a/folder', 'path/to/archive.zip', [options])

// Extract a zip to a folder

let res = await zip.extract('path/to/archive.zip', 'path/to/files', [options])
```

## Develop

This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.


## Run

- `yarn dev`


## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests




# Copyright & License

Copyright (c) 2013-2021 Ghost Foundation - Released under the [MIT license](LICENSE).
