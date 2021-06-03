# Update Check Service
Makes a request to updates.ghost.org to check for release & custom notifications. The service is provided in return for users opting in to anonymous usage data collection.

## Install

`npm install @tryghost/update-check-service --save`

or

`yarn add @tryghost/update-check-service`


## Usage
Check the UpdateCheckService's constructor JSDoc for the list of available parameters. This is how the service is initialized in Ghost:
```js
const api = require('./api').v2;
const GhostMailer = require('./services/mail').GhostMailer;
const config = require('../shared/config');
const urlUtils = require('./../shared/url-utils');

const i18n = require('../shared/i18n');
const logging = require('../shared/logging');
const request = require('./lib/request');
const ghostVersion = require('./lib/ghost-version');
const UpdateCheckService = require('@tryghost/update-check-service');

const updateChecker = new UpdateCheckService({
    api: {
        settings: {
            read: api.settings.read,
            edit: api.settings.edit
        },
        posts: {
            browse: api.posts.browse
        },
        users: {
            browse: api.users.browse
        },
        notifications: {
            add: api.notifications.add
        }
    },
    config: {
        mail: config.get('mail'),
        env: config.get('env'),
        databaseType: config.get('database').client,
        checkEndpoint: config.get('updateCheck:url'),
        isPrivacyDisabled: config.isPrivacyDisabled('useUpdateCheck'),
        notificationGroups: config.get('notificationGroups'),
        siteUrl: urlUtils.urlFor('home', true),
        forceUpdate: config.get('updateCheck:forceUpdate'),
        ghostVersion: ghostVersion.original
    },
    i18n,
    logging,
    request,
    sendEmail: ghostMailer.send
});

// run the update check with 

updateChecker.check();
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
