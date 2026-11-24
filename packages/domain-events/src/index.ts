import { domainEvents as DomainEvents } from './domain-events.ts';

export type { ConstructorOf, IEvent } from './domain-events.ts';

// Ghost's CommonJS code does `const DomainEvents = require('@tryghost/domain-events')`
// and expects the event bus itself, not a module namespace. Node returns the
// `module.exports` export from `require()` of an ES module, so that contract
// holds without a second CommonJS build.
export { DomainEvents, DomainEvents as default, DomainEvents as 'module.exports' };
