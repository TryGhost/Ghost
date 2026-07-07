/**
 * A callable stand-in for knex that re-resolves the real instance on every
 * use. The process bookshelf binds this once, so model queries always hit the
 * connection the container currently serves — even when models were required
 * before boot wired the scope.
 */

const createKnexProxy = (resolveKnex) => {
    const isInteropProbe = prop => typeof prop === 'symbol' || prop === '__esModule' || prop === 'default' || prop === 'then' || prop === 'module.exports';

    return new Proxy(function () {}, {
        apply: (_, thisArg, args) => resolveKnex()(...args),
        get: (_, prop) => {
            if (isInteropProbe(prop)) {
                return undefined;
            }
            const knex = resolveKnex();
            const value = Reflect.get(knex, prop);
            return typeof value === 'function' ? value.bind(knex) : value;
        },
        set: (_, prop, value) => Reflect.set(resolveKnex(), prop, value),
        has: (_, prop) => (isInteropProbe(prop) ? false : Reflect.has(resolveKnex(), prop))
    });
};

module.exports = {
    createKnexProxy,
    knexProxy: createKnexProxy(() => require('./index').knex)
};
