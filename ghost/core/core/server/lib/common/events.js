/**
 * Why has this not been moved to e.g. @tryghost/events or shared yet?
 *
 * - We currently massively overuse this utility, coupling together bits of the codebase in unexpected ways
 * - We want to prevent this, not reinforce it
 * * Having an @tryghost/events or shared/events module would reinforce this bad patter of using the same event emitter everywhere
 *
 * - Ideally, we want to refactor to:
 *    - either remove dependence on events where we can
 *    - or have separate event emitters for e.g. model layer and routing layer
 *
 */

const createEventRegistry = require('./create-event-registry');

let legacyInstance;

// Legacy path for processes that never boot the container (CLI tools, bare unit tests)
const resolveEvents = () => {
    const {hasDefaultScope, getCurrentScope} = require('../../../shared/container/current');
    if (hasDefaultScope()) {
        return getCurrentScope().resolve('events');
    }
    legacyInstance = legacyInstance || createEventRegistry();
    return legacyInstance;
};

// Fully transparent so sinon can stub methods and EventEmitter internals hit the resolved instance
module.exports = new Proxy({}, {
    get: (_, prop) => Reflect.get(resolveEvents(), prop),
    set: (_, prop, value) => Reflect.set(resolveEvents(), prop, value),
    has: (_, prop) => Reflect.has(resolveEvents(), prop),
    deleteProperty: (_, prop) => Reflect.deleteProperty(resolveEvents(), prop),
    ownKeys: () => Reflect.ownKeys(resolveEvents()),
    getOwnPropertyDescriptor: (_, prop) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(resolveEvents(), prop);
        if (descriptor) {
            descriptor.configurable = true;
        }
        return descriptor;
    },
    defineProperty: (_, prop, descriptor) => Reflect.defineProperty(resolveEvents(), prop, descriptor),
    getPrototypeOf: () => Reflect.getPrototypeOf(resolveEvents())
});
