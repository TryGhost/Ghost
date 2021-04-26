// @TODO: refactor constructor pattern so we don't have to require config here?
const config = require('./shared/config');
const {events} = require('./server/lib/common');
const themeEngine = require('./frontend/services/theme-engine');

class Bridge {
    constructor() {
        /**
         * When locale changes, we reload theme translations
         * @deprecated: the term "lang" was deprecated in favour of "locale" publicly 4.0
         */
        events.on('settings.lang.edited', () => {
            this.getActiveTheme().initI18n();
        });
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
