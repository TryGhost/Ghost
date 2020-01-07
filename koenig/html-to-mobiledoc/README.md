# HTML To Mobiledoc

Convert HTML strings into Mobiledoc objects.

## Install

`npm install @tryghost/html-to-mobiledoc --save`

or

`yarn add @tryghost/html-to-mobiledoc`


## Usage

``` js
const converter = require('@tryghost/html-to-mobiledoc');
converter.toMobiledoc('<p>Hello World!</p>');
```

By default, we use the parser plugins from `@tryghost/kg-parser-plugins`, which convert to Ghost's cards.
To override this, pass in your own parser plugins:

``` js
converter.toMobiledoc('<p>Hello World!</p>', {plugins: []});
```

You can also extend Ghost's plugins:

``` js
const plugins = require('@tryghost/kg-parser-plugins');

const myPlugin = (node) => {
    // do stuff
};

plugins.push(myPlugin);
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

Copyright (c) 2018-2020 Ghost Foundation - Released under the [MIT license](LICENSE).
