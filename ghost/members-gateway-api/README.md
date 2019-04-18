# Members Gateway Api

## Install

`npm install @tryghost/members-gateway-api --save`

or

`yarn add @tryghost/members-gateway-api`


## Usage

```js
const gatewayApi = require('@tryghost/members-gateway-api');
const gatewayUrl = 'https://domain.tld/members/gateway';
const gatewayFrame = document.querySelector(`iframe[src="${gatewayUrl}"]`);

const api = gatewayApi(gatewayFrame);

const email = 'user@domain.tld';
const password = 'hunter2';

api.signin({email, password}).then(() => {
    api.getToken({fresh: true}).then((token) => {
        fetch(`/some-data?token=${token}`).then(renderStuffs);
    });
})

api.bus.on('signout', () => {
    location.redirect('/goodbye');
});
```

### Api

#### `api = gatewayApi(iframe)`

Creates an instance of gateway-api, wrapping the iframe and using `postMessage` to communicate with the gateway

#### `api.bus`

An event emitter for listening to events from the gateway

#### `api.bus.on(event, fn)`

Add `fn` as a listener for event

#### `api.bus.off(event, fn)`

Remove `fn` as a listener for event

#### `api.getConfig()`

Returns a promise which resolves to the public config for the members api

#### `api.getToken({audience, fresh})`

Returns a promise for a token for the audience passed.
If fresh is true, a new token will be fetched from the backend.
The audience defaults to the origin of the requesting page

*This promise can resolve with `null`*

#### `api.signout()`

Returns a promise for a boolean indicating whether the signout was successful


#### `api.signin({email, password})`

Accepts an email and password for a valid account.

Returns a promise for a boolean indicating whether the signin was successful

#### `api.signup({name, email, password)`

Accepts a name, unqiue email and password to create an account.

Returns a promise for a boolean indicating whether the signup was successful

#### `api.requestPasswordReset({email})`

Accepts the email of the account to request a password reset for.

Returns a promise for a boolean indicating whether the password reset request was successful

#### `api.resetPassword({token, password})`

Accepts a token from a password reset request email, and a new password

Returns a promise for a boolean indicating whether the password reset was successful


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
