const Base = require('./sso-base');

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
