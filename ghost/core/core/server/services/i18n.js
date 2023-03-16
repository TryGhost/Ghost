//const debug = require('@tryghost/debug')('i18n');
const i18n = require('@tryghost/i18n');

module.exports.init = function () {
    //const events = require('../lib/common/events');
    //const settingsCache = require('../../shared/settings-cache');

    module.exports = i18n(/* settingsCache.get('locale') */ 'en', 'ghost');

    /*events.on('settings.locale.edited', (model) => {
        debug('locale changed, updating i18n to', model.get('value'));
        i18nInstance.changeLanguage(model.get('value'));
    });*/
};
