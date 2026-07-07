/**
 * Builds a transparent proxy that serves a module's legacy singleton surface
 * from the current container scope. Fully transparent so method stubbing
 * (sinon) and prototype internals (EventEmitter) hit the resolved instance.
 * Falls back to a process-local instance for processes that never boot the
 * container (CLI tools, bare unit tests).
 *
 * @param {string} registrationName
 * @param {() => object} createLegacy
 */
module.exports = function createFacade(registrationName, createLegacy) {
    let legacyInstance;

    const resolve = () => {
        const {hasDefaultScope, getCurrentScope} = require('./current');
        if (hasDefaultScope()) {
            return getCurrentScope().resolve(registrationName);
        }
        legacyInstance = legacyInstance || createLegacy();
        return legacyInstance;
    };

    return new Proxy({}, {
        get: (_, prop) => Reflect.get(resolve(), prop),
        set: (_, prop, value) => Reflect.set(resolve(), prop, value),
        has: (_, prop) => Reflect.has(resolve(), prop),
        deleteProperty: (_, prop) => Reflect.deleteProperty(resolve(), prop),
        ownKeys: () => Reflect.ownKeys(resolve()),
        getOwnPropertyDescriptor: (_, prop) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), prop);
            if (descriptor) {
                descriptor.configurable = true;
            }
            return descriptor;
        },
        defineProperty: (_, prop, descriptor) => Reflect.defineProperty(resolve(), prop, descriptor),
        getPrototypeOf: () => Reflect.getPrototypeOf(resolve())
    });
};
