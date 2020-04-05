# Session From Token Middleware

Middleware to handle generating sessions from tokens, for example like with magic links, or SSO flows similar to SAML.

## Install

`npm install @tryghost/mw-session-from-token --save`

or

`yarn add @tryghost/mw-session-from-token`


## Usage

```js
const sessionFromTokenMiddleware = require('@tryghost/mw-session-from-token')({
    callNextWithError: true,
    async createSession(req, res, user) {
        req.session.user_id = user.id;
    },
    async getTokenFromRequest(res) {
        return req.headers['some-cool-header'];
    },
    async getLookupFromToken(token) {
        await someTokenService.validate(token);
        const data = await someTokenService.getData(token);
        return data.email;
    },
    async findUserByLookup(lookup) {
        return await someUserModel.findOne({email: lookup});
    }
});

someExpressApp.get('/some/sso/url', someSessionMiddleware, sessionFromTokenMiddleware, (req, res, next) => {
    res.redirect('/loggedin');
}, (err, res, res, next) => {
    res.redirect('/error');
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

Copyright (c) 2020 Ghost Foundation - Released under the [MIT license](LICENSE).
