class BaseCacheAdapter {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            // NOTE: "keys" method is only here to provide smooth migration from deprecated "getAll" method
            //       once use of "getAll" is eradicated, can also remove the "keys" method form the interface
            value: ['get', 'set', 'reset', 'keys'],
            writable: false
        });
    }
}

module.exports = BaseCacheAdapter;
