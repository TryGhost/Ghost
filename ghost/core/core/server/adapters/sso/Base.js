module.exports = class SSOBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['getRequestCredentials', 'getIdentityFromCredentials', 'getUserForIdentity'],
            writable: false
        });
    }
};
