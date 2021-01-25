# Magic Link

## Install

`npm install @tryghost/magic-link --save`

or

`yarn add @tryghost/magic-link`


## Usage

```js
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const MagicLink = require('@tryghost/magic-link');

async function main() {
    const jwtSecret = crypto.randomBytes(16).toString('hex');

    // https://nodemailer.com/about/#example
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass // generated ethereal password
        }
    }, {
        from: '"Your App" <signin@example.com>',
        subject: 'Whatever'
    });

    const service = MagicLink({
        tokenProvider: new MagicLink.JWTTokenProvider(jwtSecret),
        transporter,
        getSigninURL(token) {
            return `http://example.com/signin?token=${token}`
        }
    });

    /**
     *  POST /signin
     */
    const {url, info} = await service.sendMagicLink({
        email: 'test@example.com',
        tokenData: {
            id: 'some-id'
        }
    });

    // https://nodemailer.com/about/#example
    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

    /**
     *  GET /signin
     */
    const data = await service.getDataFromToken(token);
    // createSomeKindOfSession(user);
}

main();
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

Copyright (c) 2013-2021 Ghost Foundation - Released under the [MIT license](LICENSE).
