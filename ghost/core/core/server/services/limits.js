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
 * Route guard for a feature a host can switch off, for the routes that exist only to
 * change it. Answers 403 with the host's own wording, which is a different thing to tell a
 * caller than the 404 a labs flag gives: the feature exists, this plan does not include it.
 */
const requireFeature = (limitName) =>
  async function requireFeatureMw(req, res, next) {
    try {
      await limitService.errorIfWouldGoOverLimit(limitName);
      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = limitService;

module.exports.init = init;
module.exports.requireFeature = requireFeature;
