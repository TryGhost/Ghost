# Limit Service
This module is intended to hold **all of the logic** for testing if site:
- would be over a given limit if they took an action (i.e. added one more thing, switched to a different limit)
- if they are over a limit already
- consistent error messages explaining why the limit has been reached 

## Install

`npm install @tryghost/limit-service --save`

or

`yarn add @tryghost/limit-service`


## Usage
Below is a sample code to wire up limit service and perform few common limit checks:

```js
const LimitService = require('@tryghost/limit-service');

// create a LimitService instance
const limitService = new LimitService();

// setup limit configuration
// currently supported limit keys are: staff, members, customThemes, customIntegrations
// all limit configs support custom "error" configuration that is a template string
const limits = {
    // staff and member are "max" type of limits accepting "max" configuration
    staff: {
        max: 1,
        error: 'Your plan supports up to {{max}} staff users. Please upgrade to add more.'
    },
    members: {
        max: 1000,
        error: 'Your plan supports up to {{max}} members. Please upgrade to reenable publishing.'
    },
    // customThemes and customIntegrations are "flag" type of limits accepting disabled boolean configuration
    customThemes: {
        disabled: true,
        error: 'All our official built-in themes are available the Starter plan, if you upgrade to one of our higher tiers you will also be able to edit and upload custom themes for your site.'
    },
    customIntegrations: {
        disabled: true,
        error: 'You can use all our official, built-in integrations on the Starter plan. If you upgrade to one of our higher tiers, you’ll also be able to create and edit custom integrations and API keys for advanced workflows.'
    }
};

// initialize the URL linking to help documentation etc.
const helpLink = 'https://ghost.org/help/';

// initialize knex db connection for the limit service to use when running query checks
const db = knex({
    client: 'mysql',
    connection: {
        user: 'root',
        password: 'toor',
        host: 'localhost',
        database: 'ghost',
    }
});

// finish initializing the limits service
limitService.loadLimits({limits, db, helpLink});

// perform limit checks

// check if there is a 'staff' limit configured
if (limitService.isLimited('staff')) {
    // throws an error if current 'staff' limit **would** go over the limit set up in configuration (max:1)
    await limitService.errorIfWouldGoOverLimit('staff');

    // same as above but overrides the default max check from max of 1 to 100
    // useful in cases you need to check if specific instance would still be over the limit if the limit changed
    await limitService.errorIfWouldGoOverLimit('staff', {max: 100});
}

// "max" types of limits have currentCountQuery method reguring a number that is currently in use for the limit
// for example it could be 1, 3, 5 or whatever amount of 'staff' is currently in the system
const staffCount = await limitService.currentCountQuery('staff');

// do something with that number
console.log(`Your current staff count is at: ${staffCount}!`);

// check if there is a 'members' limit configured
if (limitService.isLimited('members')) {
    // throws an error if current 'staff' limit **is** over the limit set up in configuration (max: 1000)
    await limitService.errorIfIsOverLimit('members');

    // same as above but overrides the default max check from max of 1000 to 10000
    // useful in cases you need to check if specific instance would still be over the limit if the limit changed
    await limitService.errorIfIsOverLimit('members', {max: 10000});
}
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
