# Domain Events

## Purpose

Lightweight domain event bus for publishing and subscribing to application-level events.

This is an internal workspace package. See the
[internal package golden path](../README.md) for its standing architecture and
maintenance rules.

## Usage

```ts
import DomainEvents from '@tryghost/domain-events';

class MyEvent {
  timestamp = new Date();
  data: { message: string };

  constructor(message: string) {
    this.data = { message };
  }
}

DomainEvents.subscribe(MyEvent, function handler(event) {
  console.log(event.data.message);
});

DomainEvents.dispatch(new MyEvent('hello world'));
```

CommonJS code gets the same event bus from `require()`:

```js
const DomainEvents = require('@tryghost/domain-events');
```

## One event bus per process

The event bus is a singleton. The package registers it under a global symbol,
so `import` and `require()` return the same bus even where the module is loaded
more than once, as Ghost's test runner does. Subscribers and dispatched events
are therefore shared by every consumer in the process.

## Develop

From the package directory:

```bash
pnpm build   # compile to build/ with tsc (ESM)
pnpm test    # type-check + unit tests
pnpm lint    # lint source and tests
```
