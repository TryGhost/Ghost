# Moleculer Service From Class

This module is used to wrap a standard JS Class as a moleculer service, exposing
the public methods as actions on the service. It will also wrap other moleculer
services in an object with methods, for each of the services actions and injects
them into the class constructor.

This allows us to write generic code, and then use moleculer as the transport
layer between services, taking advantage of its load balancing, transporters,
logging, tracing & other niceitys

Because moleculer is an asyncronous transport mechanism - all methods MUST be
async. Also all methods should accept params as an object with keys - this works
with moleculers concept of `ctx.params` much better.

Private methods are prefixed with an underscore ('_')

## Install

`npm install @tryghost/moleculer-service-from-class --save`

or

`yarn add @tryghost/moleculer-service-from-class`


## Usage

```js
const srvFromClass = require('@tryghost/moleculer-service-from-class');

class SomeService {
    async capitalize({string}) {
        return string.toUpperCase();
    }
}

class MyAwesomeService {
    constructor({someService, someConfig}) {
        this._someService = someService;
        this._someConfig = someConfig;
    }

    async myCoolMethod({name}) {
        const NAME = await this._someService.capitalize({string: name});

        return `${this._someConfig.greeting}, ${NAME}`;
    }
}

/**
 * Moleculer way
 */

const { ServiceBroker } = require('moleculer');

const broker = new ServiceBroker();
broker.addService(srvFromClass({
    Service: SomeService,
    name: 'some-service'
}));
broker.addService(srvFromClass({
    Service: MyAwesomeService,
    name: 'awesome',
    serviceDeps: {
        someService: 'some-service'
    },
    staticDeps: {
        someConfig: { greeting: 'hello' }
    }
}))

broker.start().then(() => {
    broker.call('awesome.myCoolMethod', {name: 'egg'}).then(console.log);
});


/**
 * Generic way
 */

const awesome = new MyAwesomeService({
    someConfig: { greeting: 'Hello' },
    someService: new SomeService()
});

awesome.myCoolMethod({name: 'egg'}).then(console.log);
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
