import type DomainEventsModule from '@tryghost/domain-events';

// Ghost's server code loads `@tryghost/domain-events` with `require()`, which
// goes through the tsx hook registered in the vitest setup files. A test file's
// `import` of the same package goes through Vite instead. The package is an ES
// module, and tsx and Vite each evaluate their own copy of one, so the tests
// would get a different event bus from the code they are testing.
//
// The vitest configs alias the package to this file, which hands tests the bus
// from `require()`, the same one the server code has.
const DomainEvents: typeof DomainEventsModule = require('@tryghost/domain-events');

export { DomainEvents, DomainEvents as default };
