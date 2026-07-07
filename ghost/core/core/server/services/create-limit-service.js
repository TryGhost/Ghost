const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const LimitService = require('@tryghost/limit-service');

/**
 * @param {object} options
 * @param {() => object|undefined} options.getHostSettings - read the current hostSettings; a thunk so re-init picks up config changes
 * @param {object} options.db - object exposing a knex instance for db-backed limit checks
 */
module.exports = function createLimitService({getHostSettings, db}) {
    const limitService = new LimitService();

    limitService.init = () => {
        const hostSettings = getHostSettings() || {};

        let helpLink;
        if (hostSettings.billing?.enabled === true && hostSettings.billing?.url) {
            helpLink = hostSettings.billing.url;
        } else {
            helpLink = 'https://ghost.org/help/';
        }

        let subscription;
        if (hostSettings.subscription) {
            subscription = {
                startDate: hostSettings.subscription.start,
                interval: 'month'
            };
        }

        const hostLimits = hostSettings.limits || {};

        try {
            limitService.loadLimits({
                limits: hostLimits,
                subscription,
                db,
                helpLink,
                errors
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

    limitService.init();

    return limitService;
};
