const _ = require('lodash');
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

// flags in this list always return `true`, allows quick global enable prior to full flag removal
const GA_FEATURES = [
    'audienceFeedback',
    'collections',
    'themeErrorsNotification',
    'outboundLinkTagging',
    'announcementBar',
    'newEmailAddresses',
    'internalLinking'
];

// NOTE: this allowlist is meant to be used to filter out any unexpected
//       input for the "labs" setting value
const BETA_FEATURES = [
    'additionalPaymentMethods',
    'i18n',
    'activitypub',
    'stripeAutomaticTax',
    'webmentions',
    'editorExcerpt'
];

const ALPHA_FEATURES = [
    'ActivityPub',
    'NestPlayground',
    'urlCache',
    'lexicalMultiplayer',
    'emailCustomization',
    'mailEvents',
    'collectionsCard',
    'tipsAndDonations',
    'importMemberTier',
    'lexicalIndicators',
    'adminXDemo',
    'contentVisibility'
];

module.exports.GA_KEYS = [...GA_FEATURES];
module.exports.WRITABLE_KEYS_ALLOWLIST = [...BETA_FEATURES, ...ALPHA_FEATURES];

module.exports.getAll = () => {
    const labs = _.cloneDeep(settingsCache.get('labs')) || {};

    ALPHA_FEATURES.forEach((alphaKey) => {
        if (labs[alphaKey] && !(config.get('enableDeveloperExperiments') || process.env.NODE_ENV.startsWith('test'))) {
            delete labs[alphaKey];
        }
    });

    GA_FEATURES.forEach((gaKey) => {
        labs[gaKey] = true;
    });

    const labsConfig = config.get('labs') || {};
    Object.keys(labsConfig).forEach((key) => {
        labs[key] = labsConfig[key];
    });

    labs.members = settingsCache.get('members_signup_access') !== 'none';

    return labs;
};

module.exports.getAllFlags = function () {
    return [...GA_FEATURES, ...BETA_FEATURES, ...ALPHA_FEATURES];
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
    errDetails.message = tpl(options.errorMessage || messages.errorMessage, {helperName: options.helperName});
    errDetails.context = tpl(options.errorContext || messages.errorContext, {
        helperName: options.helperName,
        flagName: options.flagName
    });
    errDetails.help = tpl(options.errorHelp || messages.errorHelp, {url: options.helpUrl});

    // eslint-disable-next-line no-restricted-syntax
    logging.error(new errors.DisabledFeatureError({
        message: errDetails.message,
        context: errDetails.context,
        help: errDetails.help
    }));

    const {SafeString} = require('express-hbs');
    errString = new SafeString(`<script>console.error("${_.values(errDetails).join(' ')}");</script>`);

    if (options.async) {
        return Promise.resolve(errString);
    }

    return errString;
};

module.exports.enabledMiddleware = flag => function labsEnabledMw(req, res, next) {
    if (module.exports.isSet(flag) === true) {
        return next();
    } else {
        return next(new errors.NotFoundError());
    }
};
