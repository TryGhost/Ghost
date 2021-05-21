const {MaxLimit, MaxPeriodicLimit, FlagLimit, AllowlistLimit} = require('./limit');
const config = require('./config');
const _ = require('lodash');

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
     * @param {Object} options.errors - instance of errors compatible with Ghost-Ignition's errors (https://github.com/TryGhost/Ignition#errors)
     */
    loadLimits({limits = {}, subscription, helpLink, db, errors}) {
        if (!errors) {
            throw new Error(`Config Missing: 'errors' is required.`);
        }

        this.errors = errors;

        // CASE: reset internal limits state in case load is called multiple times
        this.limits = {};

        Object.keys(limits).forEach((name) => {
            name = _.camelCase(name);

            // NOTE: config module acts as an allowlist of supported config names, where each key is a name of supported config
            if (config[name]) {
                /** @type LimitConfig */
                let limitConfig = Object.assign({}, config[name], limits[name]);

                if (_.has(limitConfig, 'allowlist')) {
                    this.limits[name] = new AllowlistLimit({name, config: limitConfig, helpLink, errors});
                } else if (_.has(limitConfig, 'max')) {
                    this.limits[name] = new MaxLimit({name: name, config: limitConfig, helpLink, db, errors});
                } else if (_.has(limitConfig, 'maxPeriodic')) {
                    if (subscription === undefined) {
                        throw new errors.IncorrectUsageError({message: 'Attempted to setup a periodic max limit without a subscription'});
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
        return !!this.limits[_.camelCase(limitName)];
    }

    async checkIsOverLimit(limitName) {
        if (!this.isLimited(limitName)) {
            return;
        }

        try {
            await this.limits[limitName].errorIfIsOverLimit();
            return false;
        } catch (error) {
            if (error instanceof this.errors.HostLimitError) {
                return true;
            }

            throw error;
        }
    }

    async checkWouldGoOverLimit(limitName, metadata = {}) {
        if (!this.isLimited(limitName)) {
            return;
        }

        try {
            await this.limits[limitName].errorIfWouldGoOverLimit(metadata);
            return false;
        } catch (error) {
            if (error instanceof this.errors.HostLimitError) {
                return true;
            }

            throw error;
        }
    }

    async errorIfIsOverLimit(limitName, metadata = {}) {
        if (!this.isLimited(limitName)) {
            return;
        }

        await this.limits[limitName].errorIfIsOverLimit(metadata);
    }

    async errorIfWouldGoOverLimit(limitName, metadata = {}) {
        if (!this.isLimited(limitName)) {
            return;
        }

        await this.limits[limitName].errorIfWouldGoOverLimit(metadata);
    }

    /**
     * Checks if any of the configured limits acced
     *
     * @returns {boolean}
     */
    async checkIfAnyOverLimit() {
        for (const limit in this.limits) {
            if (await this.checkIsOverLimit(limit)) {
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
