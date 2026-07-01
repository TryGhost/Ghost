module.exports = class RouteSettingsStoreBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['get', 'replace'],
            writable: false
        });
    }
};
