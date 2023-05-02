const Base = require('./SSOBase');

module.exports = class DefaultSSOAdapter extends Base {
    constructor() {
        super();
    }

    async getRequestCredentials() {
        return null;
    }

    async getIdentityFromCredentials() {
        return null;
    }

    async getUserForIdentity() {
        return null;
    }
};
