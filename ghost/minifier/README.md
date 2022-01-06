# Minifier

## Install

`npm install @tryghost/minifier --save`

or

`yarn add @tryghost/minifier`


## Usage
```
const Minifier = require('@tryghost/minifier');
const minifier = new Minifier({
    src: 'my/src/path',
    dest: 'my/dest/path'
});

minifier.minify({
    'some.css': '*.css',
    'then.js': '!(other).js'
});
```

- Minfier constructor requires a src and a dest
- minify() function takes an object with destination file as the key and source glob as the value
    - globs can be anything tiny-glob supports
    - destination files must end with .css or .js
    - src files will be minified according to their destination file extension

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
