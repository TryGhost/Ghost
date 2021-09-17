# Domain Events

## Install

`npm install @tryghost/domain-events --save`

or

`yarn add @tryghost/domain-events`


## Usage

```js
const DomainEvents = require('@tryghost/domain-events');

class MyEvent {
    constructor(message) {
        this.timestamp = new Date();
        this.data = {
            message
        };
    }
}

DomainEvents.subscribe(MyEvent, function handler(event) {
    console.log(event.data.message);
});

const event = new MyEvent('hello world');

DomainEvents.dispatch(event);
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


