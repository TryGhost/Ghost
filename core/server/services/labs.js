const _ = require('lodash');
const Promise = require('bluebird');
const SafeString = require('../../frontend/services/theme-engine/engine').SafeString;
const errors = require('@tryghost/errors');
const i18n = require('../../shared/i18n');
const logging = require('../../shared/logging');
const settingsCache = require('../services/settings/cache');
const config = require('../../shared/config');

// NOTE: this allowlist is meant to be used to filter out any unexpected
//       input for the "labs" setting value
const WRITABLE_KEYS_ALLOWLIST = [
    'activitypub',
    'matchHelper',
    'multipleProducts'
];

module.exports.WRITABLE_KEYS_ALLOWLIST = WRITABLE_KEYS_ALLOWLIST;

module.exports.getAll = () => {
    const labs = _.cloneDeep(settingsCache.get('labs')) || {};

    labs.members = settingsCache.get('members_signup_access') !== 'none';

    return labs;
};

module.exports.isSet = function isSet(flag, options = {}) {
    const labsConfig = module.exports.getAll();
    const hasFlag = !!(labsConfig && labsConfig[flag] && labsConfig[flag] === true);
    if (options.alpha) {
        return hasFlag && config.get('enableDeveloperExperiments');
    }
    return hasFlag;
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
