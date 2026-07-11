module.exports = class RedirectsStoreBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['getAll', 'replaceAll'],
            writable: false
        });
    }
};
