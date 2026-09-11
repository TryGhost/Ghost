# Limit Service

This module is intended to hold **all of the logic** for testing if site:

- would be over a given limit if they took an action (i.e. added one more thing, switched to a different limit)
- if they are over a limit already
- consistent error messages explaining why the limit has been reached

## Install

`npm install @tryghost/limit-service --save`

or

`yarn add @tryghost/limit-service`

## Where this package came from

This package was published as `@tryghost/limit-service` from TryGhost/SDK, and was moved
into Ghost with its history rather than copied. The commits are in Ghost's history, but
`git log --follow` cannot reach them: it does not traverse the merge that brought them in,
so following a file stops at the move into `src`.

To read the history from before the move, ask for it at the path the file had in the SDK,
starting from the imported tip:

    git log 1c455660017aa94f2943729934535aeeef17d96c -- lib/limit.js

`1c45566` is the last SDK commit before the import. Everything before it is ordinary
history and can be browsed, blamed and bisected from there.

## Usage

Below is a sample code to wire up limit service and perform few common limit checks:

```js
import errors from '@tryghost/errors';
import {LimitService} from '@tryghost/limit-service';

// create a LimitService instance
const limitService = new LimitService();

// setup limit configuration
// any limit name may be configured; what kind of limit it is follows from the shape of
// its configuration. all limit configs support a custom "error" template string
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
    uploads: {
        // max key is in bytes
        max: 5000000,
        // formatting of the {{ max }} variable is in MB, e.g: 5MB
        error: 'Your plan supports uploads of max size up to {{max}}. Please upgrade to reenable uploading.'
    },
    limitStripeConnect: {},
    limitAnalytics: {
        disabled: false
    },
    limitSocialWeb: {
        disabled: true
    }
};

// This information is needed for the limit service to work with "max periodic" limits
// The interval value has to be 'month' as that's the only interval that was needed for
// current use case
// The startDate has to be in ISO 8601 format (https://en.wikipedia.org/wiki/ISO_8601)
const subscription = {
    interval: 'month',
    startDate: '2023-09-18T19:00:52Z'
};

// initialize the URL linking to help documentation etc.
const helpLink = 'https://ghost.org/help/';

// the database the counters below read from
const db = {
    knex: knex({
        client: 'mysql',
        connection: {
            user: 'root',
            password: 'toor',
            host: 'localhost',
            database: 'ghost'
        }
    })
};

// Say how to count each counted limit. The service never learns what it is counting or
// where the numbers come from, which is what keeps it free of any one product's schema.
const counters = {
    staff: async ({transacting} = {}) => {
        const knex = transacting ?? db.knex;
        const result = await knex('users').count('id', {as: 'count'}).first();

        return Number(result?.count ?? 0);
    },
    members: async ({transacting} = {}) => {
        const knex = transacting ?? db.knex;
        const result = await knex('members').count('id', {as: 'count'}).first();

        return Number(result?.count ?? 0);
    },
    // A limit checked against a count the caller passes in still needs a counter to exist
    uploads: () => 0
};

// Optionally, say how a count should read in a message. Uploads are configured and counted
// in bytes, but a person reading the error wants megabytes.
const formatters = {
    uploads: count => `${count / 1000000}MB`
};

// finish initializing the limits service
limitService.loadLimits({limits, counters, formatters, subscription, helpLink, errors});

// anything the service could not build is reported rather than thrown, so one bad limit
// does not cost you the rest of them
for (const problem of limitService.problems) {
    console.warn(`Skipping ${problem.limit} limit: ${problem.reason}`);
}

// perform limit checks

// check if there is a 'staff' limit configured
if (limitService.isLimited('staff')) {
    // throws an error if current 'staff' limit **would** go over the limit set up in configuration (max:1)
    await limitService.errorIfWouldGoOverLimit('staff');

    // same as above but overrides the default max check from max of 1 to 100
    // useful in cases you need to check if specific instance would still be over the limit if the limit changed
    await limitService.errorIfWouldGoOverLimit('staff', {max: 100});
}

// check if there is a 'members' limit configured
if (limitService.isLimited('members')) {
    // throws an error if current 'members' limit **is** over the limit set up in configuration (max: 1000)
    await limitService.errorIfIsOverLimit('members');

    // same as above but overrides the default max check from max of 1000 to 10000
    // useful in cases you need to check if specific instance would still be over the limit if the limit changed
    await limitService.errorIfIsOverLimit('members', {max: 10000});
}

if (limitService.isLimited('uploads')) {
    // for the uploads limit we HAVE TO pass in the "currentCount" parameter and use bytes as a base unit
    await limitService.errorIfIsOverLimit('uploads', {currentCount: frame.file.size});
}

// Limits expose an async `checkWouldGoOverLimit` method, which can be used to check whether a limit has been reached, but not throw an error:
if (await limitService.checkWouldGoOverLimit('members')) {
    console.log('Members limit has been reached!');
}

// Flag limits additionally expose a `isDisabled` sync check, which can be used instead of the async `checkWouldGoOverLimit`:
if (limitService.isDisabled('limitSocialWeb')) {
    console.log('Social web is disabled by config!');
}

// check if any of the limits are exceeded
if (await limitService.checkIfAnyOverLimit()) {
    console.log('One of the limits has been exceeded!');
}
```

### Transactions

Some limit types (`max` or `maxPeriodic`) need to fetch the current count from the database. Sometimes you need those checks to also run in a transaction. To fix that, you can pass the `transacting` option to all the available checks.

```js
db.transaction((transacting) => {
    const options = {transacting};

    await limitService.errorIfWouldGoOverLimit('newsletters', options);
    await limitService.errorIfIsOverLimit('newsletters', options);
    const a = await limitService.checkIsOverLimit('newsletters', options);
    const b = await limitService.checkWouldGoOverLimit('newsletters', options);
    const c = await limitService.checkIfAnyOverLimit(options);
});
```

### Types of limits

At the moment there are four different types of limits that limit service allows to define. These types are:

1. `flag` - is an "on/off" switch for certain feature. Example use case: "disable all emails". It's identified by a `disabled: true` property in the "limits" configuration.
2. `max` - checks if the maximum amount of the resource has been used up.Example use case: "disable creating a staff user when maximum of 5 has been reached". To configure this limit add `max: NUMBER` to the configuration. The limits that support max checks are: `members`, and `staff`
3. `maxPeriodic` - it's a variation of `max` type with a difference that the check is done over certain period of time. Example use case: "disable sending emails when the sent emails count has acceded a limit for last billing period". To enable this limit define `maxPeriodic: NUMBER` in the limit configuration and provide a subscription configuration when initializing the limit service instance. The subscription object comes as a separate parameter and has to contain two properties: `startDate` and `interval`, where `startDate` is a date in ISO 8601 format and period is `'month'` (other values like `'year'` are not supported yet)
4. `allowList` - checks if provided value is defined in configured "allowlist". Example use case: "disable theme activation if it is not an official theme". To configure this limit define `allowlist: ['VALUE_1', 'VALUE_2', 'VALUE_N']` property in the "limits" parameter.

### Supported limits

There's a limited amount of limits that are supported by limit service. The are defined by "key" property name in the "config" module. List of currently supported limit names: `members`, `staff`, `customIntegrations`, `emails`, `customThemes`, `uploads`, `limitStripeConnect`, `limitAnalytics`, and `limitSocialWeb`.

All limits can act as `flag` or `allowList` types. Only certain (`members`, `staff`) can have a `max` limit. Only `emails` currently supports the `maxPeriodic` type of limit.

### Frontend usage

A "max" or "maxPeriodic" limit has to count something, and the service never knows how: whoever loads the limits supplies a counter for each one. On a server that is a database query; in a browser it is a request. Neither has to know how the other arrives at a number.

```js
const limitService = new LimitService();

const limits = {
    staff: {max: 2}
};

const counters = {
    staff: async () => {
        const response = await fetch('/api/staff');
        const {staff} = await response.json();

        return staff.length;
    }
};

limitService.loadLimits({limits, counters, errors});

if (await limitService.checkIsOverLimit('staff')) {
    // do something as "staff" limit has been reached
}
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

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE).
