# Members Layer 2

## Install

`npm install @tryghost/members-layer2 --save`

or

`yarn add @tryghost/members-layer2`


## Usage

### As a drop in script:

This will automatically hide and show the elements with `data-members-signin` and `data-members-signout` attributes.

It will set a js cookie called `member` with the token, on the `/` path and keep it in sync with the state of the users loggedin status

It will also reload the page on login/logout, so you are able to read the cookie serverside, and do any content rendering there.
```html
<script src="members-layer2.dropin.js"></script>
<script>
    fetch('/ghost/api/v2/content/posts/<id>', { credentials: 'same-origin' });
</script>
```

### As a library

```html
<script src="members-layer2.lib.js"></script>
<script>
    Members.init(); // Sets up binding the elements to the login/logout state and member cookie
    
    fetch('/ghost/api/v2/content/posts/<id>', { credentials: 'same-origin' });
</script>
```

#### Or with a module loader

```javascript
const Members = require('@tryghost/members-layer2');

Members.init(); // Sets up binding the elements to the login/logout state

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

Copyright (c) 2018 Ghost Foundation - Released under the [MIT license](LICENSE).
