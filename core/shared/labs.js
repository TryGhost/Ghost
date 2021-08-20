const _ = require('lodash');
const Promise = require('bluebird');
const SafeString = require('express-hbs').SafeString;
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const settingsCache = require('./settings-cache');
const config = require('./config');

const messages = {
    errorMessage: 'The \\{\\{{helperName}\\}\\} helper is not available.',
    errorContext: 'The {flagName} flag must be enabled in labs if you wish to use the \\{\\{{helperName}\\}\\} helper.',
    errorHelp: 'See {url}'
};

// NOTE: this allowlist is meant to be used to filter out any unexpected
//       input for the "labs" setting value
const BETA_FEATURES = [
    'activitypub',
    'matchHelper'
];

const ALPHA_FEATURES = [
    'emailCardSegments',
    'multipleProducts',
    'savedIndicator',
    'featureImgDragDrop',
    'oauthLogin',
    'membersFiltering',
    'emailOnlyPosts',
    'dashboardTwo',
    'snippetReplacements'
];

module.exports.WRITABLE_KEYS_ALLOWLIST = [...BETA_FEATURES, ...ALPHA_FEATURES];

module.exports.getAll = () => {
    const labs = _.cloneDeep(settingsCache.get('labs')) || {};

    ALPHA_FEATURES.forEach((alphaKey) => {
        if (labs[alphaKey] && !(config.get('enableDeveloperExperiments') || process.env.NODE_ENV.match(/^testing/))) {
            delete labs[alphaKey];
        }
    });

    labs.members = settingsCache.get('members_signup_access') !== 'none';

    return labs;
};

/**
 * @param {string} flag
 * @returns {boolean}
 */
module.exports.isSet = function isSet(flag) {
    const labsConfig = module.exports.getAll();

    return !!(labsConfig && labsConfig[flag] && labsConfig[flag] === true);
};

/**
 *
 * @param {object} options
 * @param {string} options.flagKey the internal lookup key of the flag e.g. labs.isSet(matchHelper)
 * @param {string} options.flagName the user-facing name of the flag e.g. Match helper
 * @param {string} options.helperName Name of the helper to be enabled/disabled
 * @param {string} [options.errorMessage] Optional replacement error message
 * @param {string} [options.errorContext] Optional replacement context message
 * @param {string} [options.errorHelp] Optional replacement help message
 * @param {string} [options.helpUrl] Url to show in the help message
 * @param {string} [options.async] is the helper async?
 * @param {function} callback
 * @returns {Promise<Handlebars.SafeString>|Handlebars.SafeString}
 */
module.exports.enabledHelper = function enabledHelper(options, callback) {
    const errDetails = {};
    let errString;

    if (module.exports.isSet(options.flagKey) === true) {
        // helper is active, use the callback
        return callback();
    }

    // Else, the helper is not active and we need to handle this as an error
    errDetails.message = tpl(options.errorMessage || messages.errorMessage, {helperName: options.helperName}),
    errDetails.context = tpl(options.errorContext || messages.errorContext, {
        helperName: options.helperName,
        flagName: options.flagName
    });
    errDetails.help = tpl(options.errorHelp || messages.errorHelp, {url: options.helpUrl});

    logging.error(new errors.DisabledFeatureError(errDetails));

    errString = new SafeString(`<script>console.error("${_.values(errDetails).join(' ')}");</script>`);

    if (options.async) {
        return Promise.resolve(errString);
    }

    return errString;
};

module.exports.enabledMiddleware = flag => (req, res, next) => {
    if (module.exports.isSet(flag) === true) {
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
};
