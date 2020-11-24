# Job Manager

A manager for tasks that have to be performed asynchronously, optionally recurring, scheduled or one-off in their nature.

## Install

`npm install @tryghost/job-manager --save`

or

`yarn add @tryghost/job-manager`


## Usage

```js
const JobManager = require('@tryghost/job-manager');

const logging = {
    info: console.log,
    warn: console.log,
    error: console.error
};

const jobManager = new JobManager(logging);

// register a job "function" with queued execution in parent event loop
jobManager.addJob(printWord(word) => console.log(word), 'hello');

// register a job "module" with queued execution in parent even loop
jobManager.addJob('./path/to/email-module.js', {email: 'send@here.com'});

// register recurring job which needs execution outside parent event loop
jobManager.scheduleJob('every 5 minutes', './path/to/jobs/check-emails.js', {}, 'email-checker');

// register recurring job with cron syntax running every 5 minutes
// job needs execution outside parent event loop
// for cron builder check https://crontab.guru/ (first value is seconds)
jobManager.scheduleJob('0 1/5 * * * *', './path/to/jobs/check-emails.js', {}, 'email-checker-cron');
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
