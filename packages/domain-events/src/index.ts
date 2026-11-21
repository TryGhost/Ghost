import { domainEvents } from './domain-events.ts';
import type { DomainEventsApi } from './domain-events.ts';

export type { ConstructorOf, IEvent } from './domain-events.ts';

// The bus and its interface share one name, so that `DomainEvents` works both
// as a value and as a type, e.g. `Pick<DomainEvents, 'dispatch'>`.
type DomainEvents = DomainEventsApi;
const DomainEvents: DomainEvents = domainEvents;

// Ghost's CommonJS code does `const DomainEvents = require('@tryghost/domain-events')`
// and expects the event bus itself, not a module namespace. Node returns the
// `module.exports` export from `require()` of an ES module, so that contract
// holds without a second CommonJS build.
export { DomainEvents, DomainEvents as default, DomainEvents as 'module.exports' };
