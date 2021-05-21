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
const errors = require('@tryghost/errors');
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
    // customThemes is an allowlist type of limit accepting the "allowlist" configuration
    customThemes: {
        allowlist: ['casper', 'dawn', 'lyra'],
        error: 'All our official built-in themes are available the Starter plan, if you upgrade to one of our higher tiers you will also be able to edit and upload custom themes for your site.'
    },
    // customIntegrations is a "flag" type of limits accepting disabled boolean configuration
    customIntegrations: {
        disabled: true,
        error: 'You can use all our official, built-in integrations on the Starter plan. If you upgrade to one of our higher tiers, you’ll also be able to create and edit custom integrations and API keys for advanced workflows.'
    },
    // emails is a hybrid type of limit that can be a "flag" or a "max periodic" type
    // below is a "flag" type configuration
    emails: {
        disabled: true,
        error: 'Email sending has been temporarily disabled whilst your account is under review.'
    },
    // following is a "max periodic" type of configuration
    // note if you use this configuration, the limit service has to also get a 
    // "subscription" parameter to work as expected
    // emails: {
    //     maxPeriodic: 42,
    //     error: 'Your plan supports up to {{max}} emails. Please upgrade to reenable sending emails.'
    // }
};

// This information is needed for the limit service to work with "max periodic" limits
// The interval value has to be 'month' as thats the only interval that was needed for
// current usecase
// The startDate has to be in ISO 8601 format (https://en.wikipedia.org/wiki/ISO_8601)
const subscription = {
    interval: 'month',
    startDate: '2021-09-18T19:00:52Z'
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
limitService.loadLimits({limits, subscription, db, helpLink, errors});

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

// check if any of the limits are acceding
if (limitService.checkIfAnyOverLimit()) {
    console.log('One of the limits has acceded!');
}
```

### Types of limits
At the moment there are four different types of limits that limit service allows to define. These types are:
1. `flag` - is an "on/off" switch for certain feature. Example usecase: "disable all emails". It's identified by a `disabled: true` property in the "limits" configuration.
2. `max` - checks if the maximum amount of the resource has been used up.Example usecase: "disable creating a staff user when maximum of 5 has been reached". To configure this limit add `max: NUMBER` to the configuration. The limits that support max checks are: `members`, `staff`, and `customIntegrations`
3. `maxPeriodic` - it's a variation of `max` type with a difference that the check is done over certain period of time. Example usecase: "disable sending emails when the sent emails count has acceded a limit for last billing period". To enable this limit define `maxPeriodic: NUMBER` in the limit configuration and provide a subscription configuration when initializing the limit service instance. The subscription object comes as a separate parameter and has to contain two properties: `startDate` and `interval`, where `startDate` is a date in  ISO 8601 format and period is `'month'` (other values like `'year'` are not supported yet)
4. `allowList` - checks if provided value is defined in configured "allowlist". Example usecase: "disable theme activation if it is not an official theme". To configure this limit define ` allowlist: ['VALUE_1', 'VALUE_2', 'VALUE_N']` property in the "limits" parameter. 

### Supported limits
There's a limited amount of limits that are supported by limit service. The are defined by "key" property name in the "config" module. List of currently supported limit names: `members`, `staff`, `customIntegrations`, `emails`, `customThemes`. 

All limits can act as `flag` or `allowList` types. Only certain (`members`, `staff`, and`customIntegrations`) can have a `max` limit. Only `emails` currently supports the `maxPeriodic` type of limit.

### Frontend usage
In case the limit check is run without direct access to the database you can override `currentCountQuery` functions for each "max" or "maxPeriodic" type of limit. An example usecase would be a frontend client running in a browser. A browser client can check the limit data through HTTP request and then provide that data to the limit service. Example code to do exactly that:

```js
const limitService = new LimitService();

let limits = {
    staff: {
        max: 2,
        currentCountQuery: async () => (await fetch('/api/staff')).json().length
    }
};

limitService.loadLimits({limits, errors});

if (await limitService.checkIsOverLimit('staff')) {
    // do something as "staff" limit has been reached
};
```

### Custom error messages
Errors returned by the limit service can be customized. When configuring the limit service through `loadLimits` method `limits` objects can specify an `error` property that is a template string. Additionally, "MaxLimit" limit type supports following variables- {{count}} and {{max}}.

An example configuration for "MaxLimit" limit using an error template can look like following:
```json
"staff": {
    "max": 5,
    "error": "Your plan supports up to {{max}} staff users and you currently have {{count}}. Please upgrade to add more."
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
