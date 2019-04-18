# Members Gateway Protocol

This package provides a low-level wrapper around the gateway iframe, which is used to communicate with the members api.

## Install

`npm install @tryghost/members-gateway-protocol --save`

or

`yarn add @tryghost/members-gateway-protocol`


## Usage

```js
const gatewayProtocol = require('@tryghost/members-gateway-protocol');
const gatewayFrame = document.querySelector('iframe');

const { call, listen } = gatewayProtocol(gatewayFrame);

// Add listener for gateway events - limited to only once
// returns boolean indicating whether listener was added
listen(function ({event, payload}) {
    // Called for every event emitted from the gateway     
});

// Call method in gateway
call('getToken', {audience: 'whatever'}, function (err, result) {
    // Called once when gateway responds
});
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

Copyright (c) 2019 Ghost Foundation - Released under the [MIT license](LICENSE).
