# Settings Path Manager
A library which helps locating configuration paths in Ghost. For example configs for dynamic routes or redirects.

## Install

`npm install @tryghost/settings-path-manager --save`

or

`yarn add @tryghost/settings-path-manager`


## Usage
Example use in to create routes.yaml configuration files:
```js
const config = require('../shared/config'); // or whatever place the storage folders are configured at

const settingsPathManager = new SettingsPathManager({
    type: 'routes',
    paths: [config.getContentPath('settings')]
});

const filePath = settingsPathManager.getDefaultFilePath();

console.log(config.getContentPath('settings')); // -> '/content/data/'
console.log(filePath); // -> '/content/data/routes.yaml'
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

Copyright (c) 2013-2022 Ghost Foundation - Released under the [MIT license](LICENSE).
