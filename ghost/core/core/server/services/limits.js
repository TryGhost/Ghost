const camelCase = require('lodash/camelCase');
const errors = require('@tryghost/errors');
const config = require('../../shared/config');
const db = require('../data/db');
const logging = require('@tryghost/logging');
const LimitService = require('@tryghost/limit-service');
let limitService = new LimitService();

const init = () => {
  let helpLink;

  if (
    config.get('hostSettings:billing:enabled') &&
    config.get('hostSettings:billing:enabled') === true &&
    config.get('hostSettings:billing:url')
  ) {
    helpLink = config.get('hostSettings:billing:url');
  } else {
    helpLink = 'https://ghost.org/help/';
  }

  let subscription;

  if (config.get('hostSettings:subscription')) {
    subscription = {
      startDate: config.get('hostSettings:subscription:start'),
      interval: 'month',
    };
  }

  const hostLimits = config.get('hostSettings:limits') || {};

  try {
    limitService.loadLimits({
      limits: hostLimits,
      subscription,
      db,
      helpLink,
      errors,
    });
  } catch (error) {
    // Do not block the boot process for an incorrect usage error
    if (error instanceof errors.IncorrectUsageError) {
      logging.warn(error);
    } else {
      throw error;
    }
  }
};

/**
 * Read a flag limit straight from host config, in the same `{disabled, error}` shape a
 * FlagLimit is configured with.
 *
 * The limit service only recognises limit names present in the published
 * `@tryghost/limit-service` allowlist, so a name it does not know is dropped when limits
 * load and every check on it silently passes. Reading config directly keeps a new flag
 * limit switchable by host config alone. The name is matched the way the limit service
 * matches it, so config written for one path is read the same way by the other, and these
 * helpers can delegate to it once the name ships in the package.
 *
 * @param {string} limitName
 * @returns {{disabled?: boolean, error?: string}|undefined}
 */
const featureLimit = (limitName) => {
  const configured = config.get('hostSettings:limits') || {};

  // The limit service camelCases every configured name before matching it, so
  // `limit_custom_fields` and `limit-custom-fields` reach the same limit there. Matching
  // the same way keeps a host that writes either spelling from silently going ungated.
  const match = Object.keys(configured).find((name) => camelCase(name) === camelCase(limitName));
  const limit = match === undefined ? undefined : configured[match];

  if (!limit || typeof limit !== 'object' || Array.isArray(limit)) {
    return undefined;
  }

  return limit;
};

/**
 * Whether host config turns this feature off. False everywhere the limit is unset, which
 * is every self-hosted site and every plan the limit does not apply to.
 *
 * Truthiness rather than a strict `true`, because that is what the limit service tests,
 * and a host that writes the string "true" means the same thing by it.
 *
 * @param {string} limitName
 * @returns {boolean}
 */
const isFeatureDisabled = (limitName) => {
  return Boolean(featureLimit(limitName)?.disabled);
};

/**
 * The error a withheld feature is refused with: 403, carrying the host's own copy and its
 * upgrade link, so a caller can tell "your plan does not include this" apart from the 404
 * a labs flag gives for "this does not exist here".
 *
 * Shaped the way the limit service shapes its own errors, so a client reading one does not
 * have to tell the two apart, and so moving onto the package later changes nothing a
 * caller sees.
 *
 * @param {string} limitName
 */
const featureDisabledError = (limitName) => {
  const helpLink =
    config.get('hostSettings:billing:enabled') === true && config.get('hostSettings:billing:url')
      ? config.get('hostSettings:billing:url')
      : 'https://ghost.org/help/';

  return new errors.HostLimitError({
    message: featureLimit(limitName)?.error || 'Your plan does not support this feature.',
    errorDetails: { name: limitName },
    help: helpLink,
  });
};

/**
 * Route guard for a feature the host can switch off.
 *
 * @param {string} limitName
 * @returns {import('express').RequestHandler}
 */
const requireFeature = (limitName) =>
  function requireFeatureMw(req, res, next) {
    if (!isFeatureDisabled(limitName)) {
      return next();
    }

    return next(featureDisabledError(limitName));
  };

module.exports = limitService;

module.exports.init = init;
module.exports.requireFeature = requireFeature;
