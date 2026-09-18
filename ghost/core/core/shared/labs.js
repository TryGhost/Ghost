// Feature flags behaviour in tests:
// E2E tests run with every flag on, so flagged code paths are exercised by
// default — PRIVATE_FEATURES included, whether or not a test asks for them.
// GA_FEATURES are always true everywhere, not only in tests. The rest are turned
// on by fixture setup: enableAllLabsFeatures in test/utils/fixture-utils.js
// enables every key in WRITABLE_KEYS_ALLOWLIST (PUBLIC_BETA_FEATURES plus
// PRIVATE_FEATURES), and every fixture init runs it.
// So adding a key to a response behind a private flag will still change E2E
// snapshots, even though the flag is off in production.
// For more details, see the E2E testing documentation:
// https://www.notion.so/ghost/End-to-end-Testing-6a2ef073b1754b18aff42e24a632a007

const _ = require('lodash');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const settingsCache = require('./settings-cache');
const config = require('./config');
const flagOverrides = require('./labs-flag-overrides');

const messages = {
  errorMessage: 'The \\{\\{{helperName}\\}\\} helper is not available.',
  errorContext:
    'The {flagName} flag must be enabled in labs if you wish to use the \\{\\{{helperName}\\}\\} helper.',
  errorHelp: 'See {url}',
};

// flags in this list always return `true`, allows quick global enable prior to full flag removal
const GA_FEATURES = ['automationAnalytics', 'tagDetailsReact'];

// These features are considered publicly available and can be enabled/disabled by users
const PUBLIC_BETA_FEATURES = [
  'superEditors',
  'editorExcerpt',
  'additionalPaymentMethods',
  'navigationIcons',
];

// These features are considered private they live in the private tab of the labs settings page
// Which is only visible if the developer experiments flag is enabled
const PRIVATE_FEATURES = [
  'automations',
  'automationsPerTier',
  'automationRunAnalytics',
  'automationsTinybirdSync',
  'stripeAutomaticTax',
  'importMemberTier',
  'csvContentImporter',
  'adminUIRefresh',
  'admin7Pill',
  'tagsX',
  'emailUniqueid',
  'improveSendingUI',
  'themeTranslation',
  'pictureImageFormats',
  'getHelperDeduplication',
  'membersCustomFields',
  'stripeCheckoutCollection',
  'membersImportRedesign',
  'paywallImprovements',
  'selfServeArchives',
  'machinePayments',
  'postsListReact',
  'membersActivityReact',
  'editorReact',
  'dunningWarnings',
];

module.exports.GA_KEYS = [...GA_FEATURES];
module.exports.WRITABLE_KEYS_ALLOWLIST = [...PUBLIC_BETA_FEATURES, ...PRIVATE_FEATURES];

const hasOwn = (obj, key) => Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);

const membersEnabled = () => settingsCache.get('members_signup_access') !== 'none';

// Called from theme helpers on every render, so keep it allocation-light: the labs
// setting is a flat map of booleans and the settings cache parses it fresh on each
// get, so a shallow copy is enough to stop callers mutating shared state.
module.exports.getAll = () => {
  const labs = Object.assign({}, settingsCache.get('labs'));

  for (const gaKey of GA_FEATURES) {
    labs[gaKey] = true;
  }

  // Remote overrides sit above GA (so a remote entry can kill a GA flag) but below
  // config.labs (so an explicit local pin wins): config.labs > remote > GA > DB.
  // Empty on self-hosted, so this overlay is a no-op there.
  Object.assign(labs, flagOverrides.getAll(), config.get('labs') || {});

  labs.members = membersEnabled();

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
  // Checks the layers in precedence order for one key rather than building the
  // whole object, because this is the hot path for theme helpers.
  if (flag === 'members') {
    // Derived last in getAll(), so no override layer can change it.
    return membersEnabled();
  }

  const labsConfig = config.get('labs');
  if (hasOwn(labsConfig, flag)) {
    return labsConfig[flag] === true;
  }

  const override = flagOverrides.get(flag);
  if (override !== undefined) {
    return override === true;
  }

  if (GA_FEATURES.includes(flag)) {
    return true;
  }

  const labs = settingsCache.get('labs');
  return hasOwn(labs, flag) && labs[flag] === true;
};

/**
 *
 * @param {object} options
 * @param {string} options.flagKey the internal lookup key of the flag e.g. labs.isSet(matchHelper)
 * @param {string} options.flagName the user-facing name of the flag e.g. Match helper
 * @param {string} options.helperName Name of the helper to be enabled/disabled
 * @param {string} [options.helpUrl] Url to show in the help message
 * @param {function} callback
 * @returns {Handlebars.SafeString}
 */
module.exports.enabledHelper = function enabledHelper(options, callback) {
  const errDetails = {};
  let errString;

  if (module.exports.isSet(options.flagKey) === true) {
    // helper is active, use the callback
    return callback();
  }

  // Else, the helper is not active and we need to handle this as an error
  errDetails.message = tpl(messages.errorMessage, {
    helperName: options.helperName,
  });
  errDetails.context = tpl(messages.errorContext, {
    helperName: options.helperName,
    flagName: options.flagName,
  });
  errDetails.help = tpl(messages.errorHelp, { url: options.helpUrl });

  logging.error(
    new errors.DisabledFeatureError({
      message: errDetails.message,
      context: errDetails.context,
      help: errDetails.help,
    }),
  );

  const { SafeString } = require('express-hbs');
  errString = new SafeString(
    `<script>console.error("${_.values(errDetails).join(' ')}");</script>`,
  );

  return errString;
};

module.exports.enabledMiddleware = (flag) =>
  function labsEnabledMw(req, res, next) {
    if (module.exports.isSet(flag) === true) {
      return next();
    } else {
      return next(new errors.NotFoundError());
    }
  };
