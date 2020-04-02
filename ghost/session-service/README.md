# Session Service

## Install

`npm install @tryghost/session-service --save`

or

`yarn add @tryghost/session-service`


## Usage

```js
const SessionService = require('@tryghost/session-service');

const sessionService = SessionService({
    async getSession(req, res) {
        return new Promise((resolve, reject) => {
            require('express-session')(config)(req, res, (err) => {
                if (err) {
                    reject(err);
                }
                resolve(req.session);
            })
        })
    },
    async findUserById({id}) {
        return UserModel.findUserById(id);
    },
    getOriginOfRequest(req) {
        return req.headers.origin;
    }
});

app.use(async (req, res, next) => {
    try {
        const user = await sessionService.getUserForSession(req, res);
        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
});

app.post('/login', async (req, res) => {
    try {
        const user = await UserModel.verify(req.body); 
        await sessionService.createSessionForUser(req, res, user); 
        res.redirect('/home');
    } catch (err) {
        return next(err);
    }
});

app.post('/logout', async (req, res) => {
   try {
        await sessionService.destroyCurrentSession(req, res); 
        res.redirect('/login');
    } catch (err) {
        return next(err);
    }
});
```

## Develop

This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.

## Test

- `yarn types` run just type check
- `yarn lint` run just eslint
- `yarn test` run lint and tests and type check




# Copyright & License 

Copyright (c) 2020 Ghost Foundation - Released under the [MIT license](LICENSE).
