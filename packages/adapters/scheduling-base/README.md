# @tryghost/adapter-base-scheduling

Base class for Ghost scheduling adapters. A scheduling adapter is responsible
for firing Ghost's time-based jobs — publishing scheduled posts, sending
scheduled newsletters, automations, gift reminders — by calling back into
Ghost's API at the requested time.

See the [Ghost adapters documentation](https://docs.ghost.org/config#adapters)
for how adapters are configured and loaded.

## Usage

Install the base class alongside your adapter:

```bash
npm install @tryghost/adapter-base-scheduling
```

Extend `SchedulingBase` and implement every method listed in `requiredFns`:
`run`, `schedule`, and `unschedule`. `register` and `rescheduleAll` are
inherited from the base class.

Each job has a `time` (unix timestamp), a `url` to call back (carrying a
JWT-signed admin token), and an `extra` object holding the `httpMethod` to use.
At `time`, the adapter fires the HTTP request described by the job.

```js
const {SchedulingBase} = require('@tryghost/adapter-base-scheduling');

class MyScheduler extends SchedulingBase {
    constructor(options) {
        super();
        // `options` is the settings block from your Ghost config
    }

    // Called on boot. Fire any jobs whose time has already passed and start
    // watching for upcoming ones.
    run() { /* ... */ }

    // Queue `job` to fire at job.time via job.extra.httpMethod against job.url.
    schedule(job) { /* ... */ }

    // Remove a previously-scheduled job.
    unschedule(job, options) { /* ... */ }
}

module.exports = MyScheduler;
```

### Installing and activating

Place the adapter at `content/adapters/scheduling/MyScheduler/index.js` and
activate it in your Ghost config:

```json
{
    "scheduling": {
        "active": "MyScheduler",
        "MyScheduler": {}
    }
}
```

## Develop

This is a workspace package in the Ghost monorepo. From the repo root:

```bash
pnpm --filter @tryghost/adapter-base-scheduling build   # compile to build/ with tsc (ESM)
pnpm --filter @tryghost/adapter-base-scheduling test    # type-check + unit tests
pnpm --filter @tryghost/adapter-base-scheduling dev     # rebuild on change
```

This package is ESM-only and compiled with `tsc` (`module: nodenext`). Relative
imports in `src/` must carry an explicit extension; write the real `.ts` one —
`import {x} from './x.ts'` — and `tsc` rewrites it to `.js` on emit
(`rewriteRelativeImportExtensions`).

# Copyright & License

Copyright (c) 2013-2026 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
