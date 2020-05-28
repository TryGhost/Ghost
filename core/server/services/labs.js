const settingsCache = require('./settings/cache');
const _ = require('lodash');
const Promise = require('bluebird');
const SafeString = require('../../frontend/services/themes/engine').SafeString;
const errors = require('@tryghost/errors');
const {i18n} = require('../lib/common');
const logging = require('../../shared/logging');
const deprecatedFeatures = ['subscribers', 'publicAPI'];

module.exports.getAll = () => {
    let labs = _.cloneDeep(settingsCache.get('labs')) || {};
    // Remove old labs flags that should always be false now
    deprecatedFeatures.forEach((feature) => {
        delete labs[feature];
    });

    return labs;
};

module.exports.isSet = function isSet(flag) {
    const labsConfig = module.exports.getAll();

    return !!(labsConfig && labsConfig[flag] && labsConfig[flag] === true);
};

module.exports.enabledHelper = function enabledHelper(options, callback) {
    const errDetails = {};
    let errString;

    if (module.exports.isSet(options.flagKey) === true) {
        // helper is active, use the callback
        return callback();
    }

    // Else, the helper is not active and we need to handle this as an error
    errDetails.message = i18n.t(options.errMessagePath || 'warnings.helpers.helperNotAvailable', {helperName: options.helperName}),
    errDetails.context = i18n.t(options.errContextPath || 'warnings.helpers.flagMustBeEnabled', {
        helperName: options.helperName,
        flagName: options.flagName
    });
    errDetails.help = i18n.t(options.errHelpPath || 'warnings.helpers.seeLink', {url: options.helpUrl});

    logging.error(new errors.DisabledFeatureError(errDetails));

    errString = new SafeString(`<script>console.error("${_.values(errDetails).join(' ')}");</script>`);

    if (options.async) {
        return Promise.resolve(errString);
    }

    return errString;
};
