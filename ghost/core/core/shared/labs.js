// Feature flags behaviour in tests:
// By default, all flags listed in GA_FEATURES, BETA_FEATURES, and ALPHA_FEATURES
// are globally enabled during E2E tests. This ensures flagged code paths are tested
// automatically.
// For more details, see the E2E testing documentation:
// https://www.notion.so/ghost/End-to-end-Testing-6a2ef073b1754b18aff42e24a632a007

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
    'customFonts',
    'explore',
    'commentsThreads',
    'commentsPinning',
    'featurebaseFeedback',
    'dangerZoneResetAuth'
];

// These features are considered publicly available and can be enabled/disabled by users
const PUBLIC_BETA_FEATURES = [
    'superEditors',
    'editorExcerpt',
    'additionalPaymentMethods'
];

// These features are considered private they live in the private tab of the labs settings page
// Which is only visible if the developer experiments flag is enabled
const PRIVATE_FEATURES = [
    'automations',
    'stripeAutomaticTax',
    'importMemberTier',
    'urlCache',
    'lexicalIndicators',
    'adminUIRefresh',
    'emailCustomization',
    'tagsX',
    'emailUniqueid',
    'themeTranslation',
    'indexnow',
    'pictureImageFormats',
    'smarterCounts',
    'llmsTxt',
    'getHelperDeduplication'
];

module.exports.GA_KEYS = [...GA_FEATURES];
module.exports.WRITABLE_KEYS_ALLOWLIST = [...PUBLIC_BETA_FEATURES, ...PRIVATE_FEATURES];

// Resolved remote feature-flag overrides for this instance, pushed in by the
// remote-flags service (Pro-only). A flat `{flag: boolean}` map; empty when the
// feature is disabled or no manifest has been applied, which makes the overlay in
// getAll() a no-op. The store lives here so getAll() stays synchronous and reads a
// plain in-memory object on the hot path, and so this shared module never has to
// depend on a server-side service.
let remoteOverrides = {};

/**
 * Replace the active remote overrides. Called by the remote-flags service after it
 * resolves a manifest for this site. A non-object payload is treated as "none".
 * @param {Object<string, boolean>} overrides
 */
module.exports.setRemoteOverrides = function setRemoteOverrides(overrides) {
    // Store a shallow copy so the caller cannot mutate live flag state by holding
    // onto the passed object (values are primitive booleans, so this fully isolates).
    remoteOverrides = (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) ? {...overrides} : {};
};

/**
 * Drop all remote overrides, returning to purely local flag state.
 */
module.exports.clearRemoteOverrides = function clearRemoteOverrides() {
    remoteOverrides = {};
};

/**
 * The currently applied remote overrides (read-only copy for visibility/tests).
 * @returns {Object<string, boolean>}
 */
module.exports.getRemoteOverrides = function getRemoteOverrides() {
    return {...remoteOverrides};
};

module.exports.getAll = () => {
    const labs = _.cloneDeep(settingsCache.get('labs')) || {};

    GA_FEATURES.forEach((gaKey) => {
        labs[gaKey] = true;
    });

    // Remote overrides sit above GA_FEATURES (so a remote entry can kill a GA flag
    // fleet-wide) but below local config (so an explicit `config.labs` pin always
    // wins): config.labs > remote > GA_FEATURES > DB settings.
    Object.keys(remoteOverrides).forEach((key) => {
        labs[key] = remoteOverrides[key];
    });

    const labsConfig = config.get('labs') || {};
    Object.keys(labsConfig).forEach((key) => {
        labs[key] = labsConfig[key];
    });

    labs.members = settingsCache.get('members_signup_access') !== 'none';

    return labs;
};

module.exports.getAllFlags = function () {
    return [...GA_FEATURES, ...PUBLIC_BETA_FEATURES, ...PRIVATE_FEATURES];
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
