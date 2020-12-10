const Base = require('./SSOBase');

module.exports = class DefaultSSOAdapter extends Base {
    constructor() {
        super();
    }

    setupSSOApp() {
        return null;
    }

    getProviders() {
        return [];
    }
};
