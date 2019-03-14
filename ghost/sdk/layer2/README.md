# Members Layer 2

## Install

`npm install @tryghost/members-layer2 --save`

or

`yarn add @tryghost/members-layer2`


## Usage

```html
<script src="members-layer2.lib.js"></script>
<script>
    // Sets up binding the elements to the login/logout state
    Members.init().then(function ({getToken}) {
        // can getToken etc...
    });
</script>
```

#### Or with a module loader

```javascript
const Members = require('@tryghost/members-layer2');

// Sets up binding the elements to the login/logout state
Members.init().then(function ({getToken}) {
    // can get token etc...
});

fetch('/ghost/api/v2/content/posts/<id>', { credentials: 'same-origin' });
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

Copyright (c) 2018-2019 Ghost Foundation - Released under the [MIT license](LICENSE).
