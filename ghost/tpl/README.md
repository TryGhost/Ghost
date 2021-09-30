# Tpl

## Install

`npm install @tryghost/tpl --save`

or

`yarn add @tryghost/tpl`


## Usage

```
const tpl = require('@tryghost/tpl');
messages = {
    myError: 'Something terrible happened to {something}'
};

console.error(tpl(messages.myError, {something: 'The thing'}));
```

* Takes strings like 'Your site is now available on {url}' and interpolates them with passed in data
* Will ignore double or triple braces like {{get}} or {{{content}}}
* Can handle escaped braces e.g. \\\\{\\\\{{helpername}\\\\}\\\\}
* There's a simple bare minimum escaping needed to make {{{helpername}}} work with interpolation e.g. {\\\\{{helpername}}}


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
