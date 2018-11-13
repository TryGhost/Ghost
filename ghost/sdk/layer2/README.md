# Members Layer 2

## Install

`npm install @tryghost/members-layer2 --save`

or

`yarn add @tryghost/members-layer2`


## Usage

### As a drop in script:

This will attack a `Members` object to the window, with a `getToken` method.

It will automatically hide and show the elements with `data-members-signin` and `data-members-signout` attributes

```html
<script src="members-layer2.dropin.js"></script>
```

### As a library

```html
<script src="members-layer2.lib.js"></script>
<script>
    Members.init(); // Sets up binding the elements to the login/logout state

    Members.getToken();
</script>
```

```javascript
const Members = require('@tryghost/members-layer2');

Members.init(); // Sets up binding the elements to the login/logout state

Members.getToken();
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

Copyright (c) 2018 Ghost Foundation - Released under the [MIT license](LICENSE).
