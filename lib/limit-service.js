const camelCase = require('lodash/camelCase');
const has = require('lodash/has');
const {IncorrectUsageError} = require('@tryghost/errors');

const {MaxLimit, MaxPeriodicLimit, FlagLimit, AllowlistLimit} = require('./limit');
const config = require('./config');

const messages = {
    missingErrorsConfig: `Config Missing: 'errors' is required.`,
    noSubscriptionParameter: 'Attempted to setup a periodic max limit without a subscription'
};

class LimitService {
    constructor() {
        this.limits = {};
    }

    /**
     * Initializes the limits based on configuration
     *
     * @param {Object} options
     * @param {Object} [options.limits] - hash containing limit configurations keyed by limit name and containing
     * @param {Object} [options.subscription] - hash containing subscription configuration with interval and startDate properties
     * @param {String} options.helpLink - URL pointing to help resources for when limit is reached
     * @param {Object} options.db - knex db connection instance or other data source for the limit checks
     * @param {Object} options.errors - instance of errors compatible with GhostError errors (@tryghost/errors)
     */
    loadLimits({limits = {}, subscription, helpLink, db, errors}) {
        if (!errors) {
            throw new IncorrectUsageError({
                message: messages.missingErrorsConfig
            });
        }

        this.errors = errors;

        // CASE: reset internal limits state in case load is called multiple times
        this.limits = {};

        Object.keys(limits).forEach((name) => {
            name = camelCase(name);

            // NOTE: config module acts as an allowlist of supported config names, where each key is a name of supported config
            if (config[name]) {
                /** @type LimitConfig */
                let limitConfig = Object.assign({}, config[name], limits[name]);

                if (has(limitConfig, 'allowlist')) {
                    this.limits[name] = new AllowlistLimit({name, config: limitConfig, helpLink, errors});
                } else if (has(limitConfig, 'max')) {
                    this.limits[name] = new MaxLimit({name: name, config: limitConfig, helpLink, db, errors});
                } else if (has(limitConfig, 'maxPeriodic')) {
                    if (subscription === undefined) {
                        throw new IncorrectUsageError({
                            message: messages.noSubscriptionParameter
                        });
                    }

                    const maxPeriodicLimitConfig = Object.assign({}, limitConfig, subscription);
                    this.limits[name] = new MaxPeriodicLimit({name: name, config: maxPeriodicLimitConfig, helpLink, db, errors});
                } else {
                    this.limits[name] = new FlagLimit({name: name, config: limitConfig, helpLink, errors});
                }
            }
        });
    }

    isLimited(limitName) {
        return !!this.limits[camelCase(limitName)];
    }

    /**
     *
     * @param {String} limitName - name of the configured limit
     * @param {Object} [options] - limit parameters
     * @param {Object} [options.transacting] Transaction to run the count query on (if required for the chosen limit)
     * @returns
     */
    async checkIsOverLimit(limitName, options = {}) {
        if (!this.isLimited(limitName)) {
            return;
        }

        try {
            await this.limits[limitName].errorIfIsOverLimit(options);
            return false;
        } catch (error) {
            if (error instanceof this.errors.HostLimitError) {
                return true;
            }

            throw error;
        }
    }

    /**
     *
     * @param {String} limitName - name of the configured limit
     * @param {Object} [options] - limit parameters
     * @param {Object} [options.transacting] Transaction to run the count query on (if required for the chosen limit)
     * @returns
     */
    async checkWouldGoOverLimit(limitName, options = {}) {
        if (!this.isLimited(limitName)) {
            return;
        }

        try {
            await this.limits[limitName].errorIfWouldGoOverLimit(options);
            return false;
        } catch (error) {
            if (error instanceof this.errors.HostLimitError) {
                return true;
            }

            throw error;
        }
    }

    /**
     *
     * @param {String} limitName - name of the configured limit
     * @param {Object} [options] - limit parameters
     * @param {Object} [options.transacting] Transaction to run the count query on (if required for the chosen limit)
     * @returns
     */
    async errorIfIsOverLimit(limitName, options = {}) {
        if (!this.isLimited(limitName)) {
            return;
        }

        await this.limits[limitName].errorIfIsOverLimit(options);
    }

    /**
     *
     * @param {String} limitName - name of the configured limit
     * @param {Object} [options] - limit parameters
     * @param {Object} [options.transacting] Transaction to run the count query on (if required for the chosen limit)
     * @returns
     */
    async errorIfWouldGoOverLimit(limitName, options = {}) {
        if (!this.isLimited(limitName)) {
            return;
        }

        await this.limits[limitName].errorIfWouldGoOverLimit(options);
    }

    /**
     * Checks if any of the configured limits acceded
     *
     * @param {Object} [options] - limit parameters
     * @param {Object} [options.transacting] Transaction to run the count queries on (if required for the chosen limit)
     * @returns {Promise<boolean>}
     */
    async checkIfAnyOverLimit(options = {}) {
        for (const limit in this.limits) {
            if (await this.checkIsOverLimit(limit, options)) {
                return true;
            }
        }

        return false;
    }
}

module.exports = LimitService;

/**
 * @typedef {Object} LimitConfig
 * @prop {Number} [max] - max limit
 * @prop {Number} [maxPeriodic] - max limit for a period
 * @prop {Boolean} [disabled] - flag disabling/enabling limit
 * @prop {String} error - custom error to be displayed when the limit is reached
 * @prop {Function} [currentCountQuery] - function returning count for the "max" type of limit
 */
