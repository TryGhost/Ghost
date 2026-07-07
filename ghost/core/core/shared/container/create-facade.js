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

    // Module loaders probe these during require interop; resolving for them
    // would construct the instance at import time, before config/boot are ready
    const isInteropProbe = prop => typeof prop === 'symbol' || prop === '__esModule' || prop === 'default' || prop === 'then' || prop === 'module.exports';

    return new Proxy({}, {
        get: (_, prop) => {
            if (isInteropProbe(prop)) {
                return undefined;
            }
            const target = resolve();
            const value = Reflect.get(target, prop);
            // Bind prototype methods so private fields see the real instance; own-property
            // functions (sinon stubs, constructor-bound methods) keep their identity
            if (typeof value === 'function' && !Object.prototype.hasOwnProperty.call(target, prop)) {
                return value.bind(target);
            }
            return value;
        },
        set: (_, prop, value) => Reflect.set(resolve(), prop, value),
        has: (_, prop) => (isInteropProbe(prop) ? false : Reflect.has(resolve(), prop)),
        deleteProperty: (_, prop) => Reflect.deleteProperty(resolve(), prop),
        ownKeys: () => Reflect.ownKeys(resolve()),
        getOwnPropertyDescriptor: (_, prop) => {
            if (isInteropProbe(prop)) {
                return undefined;
            }
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
