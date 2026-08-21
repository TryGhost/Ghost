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

import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import _ from 'lodash';
import config from './config';
import * as flagOverrides from './labs-flag-overrides';
// @ts-expect-error This module lacks type definitions.
import settingsCache from './settings-cache';

const messages = {
  errorMessage: 'The \\{\\{{helperName}\\}\\} helper is not available.',
  errorContext:
    'The {flagName} flag must be enabled in labs if you wish to use the \\{\\{{helperName}\\}\\} helper.',
  errorHelp: 'See {url}',
};

// flags in this list always return `true`, allows quick global enable prior to full flag removal
const GA_FEATURES = ['automationAnalytics'];

// These features are considered publicly available and can be enabled/disabled by users
const PUBLIC_BETA_FEATURES = ['superEditors', 'editorExcerpt', 'additionalPaymentMethods'];

// These features are considered private they live in the private tab of the labs settings page
// Which is only visible if the developer experiments flag is enabled
const PRIVATE_FEATURES = [
  'automations',
  'automationRunAnalytics',
  'stripeAutomaticTax',
  'importMemberTier',
  'csvContentImporter',
  'adminUIRefresh',
  'tagsX',
  'emailUniqueid',
  'themeTranslation',
  'pictureImageFormats',
  'getHelperDeduplication',
  'navigationIcons',
  'membersCustomFields',
  'paywallImprovements',
  'giftSubCustomization',
  'tagDetailsReact',
  'selfServeArchives',
  'machinePayments',
];

export const GA_KEYS = [...GA_FEATURES];
export const WRITABLE_KEYS_ALLOWLIST = [...PUBLIC_BETA_FEATURES, ...PRIVATE_FEATURES];

export const getAll = () => {
  const labs = _.cloneDeep(settingsCache.get('labs')) || {};

  GA_FEATURES.forEach((gaKey) => {
    labs[gaKey] = true;
  });

  // Remote overrides sit above GA (so a remote entry can kill a GA flag) but below
  // config.labs (so an explicit local pin wins): config.labs > remote > GA > DB.
  // Empty on self-hosted, so this overlay is a no-op there.
  const remoteOverrides = flagOverrides.getAll();
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

export const getAllFlags = function () {
  return [...GA_FEATURES, ...PUBLIC_BETA_FEATURES, ...PRIVATE_FEATURES];
};

export const isSet = function isSet(flag: string): boolean {
  const labsConfig = getAll();

  return !!(labsConfig && labsConfig[flag] && labsConfig[flag] === true);
};

export function enabledHelper(
  options: {
    /** The internal lookup key of the flag e.g. labs.isSet(matchHelper) */
    flagKey: string;
    /** the user-facing name of the flag e.g. Match helper */
    flagName: string;
    /** Name of the helper to be enabled/disabled */
    helperName: string;
    /** Url to show in the help message */
    helpUrl: string;
  },
  callback: () => Handlebars.SafeString,
): Handlebars.SafeString {
  if (isSet(options.flagKey) === true) {
    // helper is active, use the callback
    return callback();
  }

  // Else, the helper is not active and we need to handle this as an error
  const errDetails = {
    message: tpl(messages.errorMessage, {
      helperName: options.helperName,
    }),
    context: tpl(messages.errorContext, {
      helperName: options.helperName,
      flagName: options.flagName,
    }),
    help: tpl(messages.errorHelp, { url: options.helpUrl }),
  };

  logging.error(
    new errors.DisabledFeatureError({
      message: errDetails.message,
      context: errDetails.context,
      help: errDetails.help,
    }),
  );

  const { SafeString } = require('express-hbs');
  const errString = new SafeString(
    `<script>console.error("${_.values(errDetails).join(' ')}");</script>`,
  );

  return errString;
}

export const enabledMiddleware = (flag: string) =>
  function labsEnabledMw(_req: unknown, _res: unknown, next: (err?: unknown) => void) {
    if (isSet(flag) === true) {
      return next();
    } else {
      return next(new errors.NotFoundError());
    }
  };
