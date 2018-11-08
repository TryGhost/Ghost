# Members - Layer 1

## Install

`npm install @tryghost/members-layer1 --save`

or

`yarn add @tryghost/members-layer1`


## Usage


```javascript
const Members = require('@ghost/members-layer1');

const members = Members(options);

// returns Promise.resolve(token|null) if they are logged in or not
members.getToken();

// returns Promise.resolve(true|false) on whether it worked or not
members.logout();

// returns Promise.resolve(true|false) on whether it worked or not
members.login();
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
