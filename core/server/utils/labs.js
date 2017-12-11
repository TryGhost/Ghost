var settingsCache = require('../settings/cache'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    SafeString = require('../themes/engine').SafeString,
    common = require('../lib/common'),
    labs = module.exports = {};

labs.isSet = function isSet(flag) {
    var labsConfig = settingsCache.get('labs');
    return labsConfig && labsConfig[flag] && labsConfig[flag] === true;
};

labs.enabledHelper = function enabledHelper(options, callback) {
    var errDetails, errString;

    if (labs.isSet(options.flagKey) === true) {
        // helper is active, use the callback
        return callback();
    }

    // Else, the helper is not active and we need to handle this as an error
    errDetails = {
        message: common.i18n.t('warnings.helpers.helperNotAvailable', {helperName: options.helperName}),
        context: common.i18n.t('warnings.helpers.flagMustBeEnabled', {
            helperName: options.helperName,
            flagName: options.flagName
        }),
        help: common.i18n.t('warnings.helpers.seeLink', {url: options.helpUrl})
    };

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
