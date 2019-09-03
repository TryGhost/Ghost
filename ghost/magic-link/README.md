# Magic Link

## Install

`npm install @tryghost/magic-link --save`

or

`yarn add @tryghost/magic-link`


## Usage

```js
const util = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const MagicLink = require('@tryghost/magic-link');

async function main() {
    const generateKeyPair = util.promisify(crypto.generateKeyPair);
    const {publicKey, privateKey} = await generateKeyPair('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
        }
    });

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
        transporter,
        publicKey,
        privateKey,
        getSigninURL(token) {
            return `http://example.com/signin?token=${token}`
        }
    });

    /**
     *  POST /signin
     */
    const {token, info} = await service.sendMagicLink({
        email: 'test@example.com',
        user: {
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
    const user = await service.getUserFromToken(token);
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

Copyright (c) 2019 Ghost Foundation - Released under the [MIT license](LICENSE).
