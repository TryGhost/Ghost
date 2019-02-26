const settingsCache = require('./settings/cache');
const _ = require('lodash');
const Promise = require('bluebird');
const SafeString = require('./themes/engine').SafeString;
const common = require('../lib/common');
const config = require('../config');
let labs = module.exports = {};

labs.isSet = function isSet(flag) {
    var labsConfig = settingsCache.get('labs');
    /**
     * TODO: Uses hard-check for members prototype, removed here when added to settings
     */
    if (flag === 'members') {
        return config.get('enableDeveloperExperiments') && labsConfig && labsConfig[flag] && labsConfig[flag] === true;
    }
    return labsConfig && labsConfig[flag] && labsConfig[flag] === true;
};

labs.getAll = () => {
    return settingsCache.get('labs');
};

labs.enabledHelper = function enabledHelper(options, callback) {
    const errDetails = {};
    let errString;

    if (labs.isSet(options.flagKey) === true) {
        // helper is active, use the callback
        return callback();
    }

    // Else, the helper is not active and we need to handle this as an error
    errDetails.message = common.i18n.t(options.errMessagePath || 'warnings.helpers.helperNotAvailable', {helperName: options.helperName}),
    errDetails.context = common.i18n.t(options.errContextPath || 'warnings.helpers.flagMustBeEnabled', {
        helperName: options.helperName,
        flagName: options.flagName
    });
    errDetails.help = common.i18n.t(options.errHelpPath || 'warnings.helpers.seeLink', {url: options.helpUrl});

    common.logging.error(new common.errors.DisabledFeatureError(errDetails));

    errString = new SafeString(
        '<script>console.error("' + _.values(errDetails).join(' ') + '");</script>'
    );

    if (options.async) {
        return Promise.resolve(function asyncError() {
            return errString;
        });
    }

    return errString;
};
