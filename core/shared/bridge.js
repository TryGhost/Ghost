// @TODO: refactor constructor pattern so we don't have to require config here?
const config = require('./config');
const themeEngine = require('../frontend/services/theme-engine');

class Bridge {
    constructor() {

    }

    getActiveTheme() {
        return themeEngine.getActive();
    }

    getFrontendApiVersion() {
        if (this.getActiveTheme()) {
            return this.getActiveTheme().engine('ghost-api');
        } else {
            return config.get('api:versions:default');
        }
    }
}

const bridge = new Bridge();

module.exports = bridge;
