const lowerCase = require('lodash/lowerCase');
const template = require('lodash/template');
const {lastPeriodStart, SUPPORTED_INTERVALS} = require('./date-utils');

const interpolate = /{{([\s\S]+?)}}/g;

class Limit {
    /**
     *
     * @param {Object} options
     * @param {String} options.name - name of the limit
     * @param {String} options.error - error message to use when limit is reached
     * @param {String} options.helpLink - URL to the resource explaining how the limit works
     * @param {Object} [options.db] - instance of knex db connection that currentCountQuery can use to run state check through
     * @param {Object} options.errors - instance of errors compatible with GhostError errors (@tryghost/errors)
     */
    constructor({name, error, helpLink, db, errors}) {
        this.name = name;
        this.error = error;
        this.helpLink = helpLink;
        this.db = db;
        this.errors = errors;
    }

    generateError() {
        let errorObj = {
            errorDetails: {
                name: this.name
            }
        };

        if (this.helpLink) {
            errorObj.help = this.helpLink;
        }

        return errorObj;
    }
}

class MaxLimit extends Limit {
    /**
     *
     * @param {Object} options
     * @param {String} options.name - name of the limit
     * @param {Object} options.config - limit configuration
     * @param {Number} options.config.max - maximum limit the limit would check against
     * @param {Function} options.config.currentCountQuery - query checking the state that would be compared against the limit
     * @param {Function} [options.config.formatter] - function to format the limit counts before they are passed to the error message
     * @param {String} [options.config.error] - error message to use when limit is reached
     * @param {String} [options.helpLink] - URL to the resource explaining how the limit works
     * @param {Object} [options.db] - instance of knex db connection that currentCountQuery can use to run state check through
     * @param {Object} options.errors - instance of errors compatible with GhostError errors (@tryghost/errors)
     */
    constructor({name, config, helpLink, db, errors}) {
        super({name, error: config.error || '', helpLink, db, errors});

        if (config.max === undefined) {
            throw new errors.IncorrectUsageError({message: 'Attempted to setup a max limit without a limit'});
        }

        if (!config.currentCountQuery) {
            throw new errors.IncorrectUsageError({message: 'Attempted to setup a max limit without a current count query'});
        }

        this.currentCountQueryFn = config.currentCountQuery;
        this.max = config.max;
        this.formatter = config.formatter;
        this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
    }

    /**
     *
     * @param {Number} count - current count that acceded the limit
     * @returns {Object} instance of HostLimitError
     */
    generateError(count) {
        let errorObj = super.generateError();

        errorObj.message = this.fallbackMessage;

        if (this.error) {
            const formatter = this.formatter || Intl.NumberFormat().format;
            try {
                errorObj.message = template(this.error, {interpolate})(
                    {
                        max: formatter(this.max),
                        count: formatter(count),
                        name: this.name
                    });
            } catch (e) {
                errorObj.message = this.fallbackMessage;
            }
        }

        errorObj.errorDetails.limit = this.max;
        errorObj.errorDetails.total = count;

        return new this.errors.HostLimitError(errorObj);
    }

    /**
     * @param {Object} [options]
     * @param {Object} [options.transacting] Transaction to run the count query on
     * @returns
     */
    async currentCountQuery(options = {}) {
        return await this.currentCountQueryFn(options.transacting ?? this.db?.knex);
    }

    /**
     * Throws a HostLimitError if the configured or passed max limit is acceded by currentCountQuery
     *
     * @param {Object} options
     * @param {Number} [options.max] - overrides configured default max value to perform checks against
     * @param {Number} [options.addedCount] - number of items to add to the currentCount during the check
     * @param {Object} [options.transacting] Transaction to run the count query on
     */
    async errorIfWouldGoOverLimit(options = {}) {
        const {max, addedCount = 1} = options;
        let currentCount = await this.currentCountQuery(options);

        if ((currentCount + addedCount) > (max || this.max)) {
            throw this.generateError(currentCount);
        }
    }

    /**
     * Throws a HostLimitError if the configured or passed max limit is acceded by currentCountQuery
     *
     * @param {Object} options
     * @param {Number} [options.max] - overrides configured default max value to perform checks against
     * @param {Number} [options.currentCount] - overrides currentCountQuery to perform checks against
     * @param {Object} [options.transacting] Transaction to run the count query on
     */
    async errorIfIsOverLimit(options = {}) {
        const currentCount = options.currentCount || await this.currentCountQuery(options);

        if (currentCount > (options.max || this.max)) {
            throw this.generateError(currentCount);
        }
    }
}

class MaxPeriodicLimit extends Limit {
    /**
     *
     * @param {Object} options
     * @param {String} options.name - name of the limit
     * @param {Object} options.config - limit configuration
     * @param {Number} options.config.maxPeriodic - maximum limit the limit would check against
     * @param {String} options.config.error - error message to use when limit is reached
     * @param {Function} options.config.currentCountQuery - query checking the state that would be compared against the limit
     * @param {('month')} options.config.interval - an interval to take into account when checking the limit. Currently only supports 'month' value
     * @param {String} options.config.startDate - start date in ISO 8601 format (https://en.wikipedia.org/wiki/ISO_8601), used to calculate period intervals
     * @param {String} options.helpLink - URL to the resource explaining how the limit works
     * @param {Object} [options.db] - instance of knex db connection that currentCountQuery can use to run state check through
     * @param {Object} options.errors - instance of errors compatible with GhostError errors (@tryghost/errors)
     */
    constructor({name, config, helpLink, db, errors}) {
        super({name, error: config.error || '', helpLink, db, errors});

        if (config.maxPeriodic === undefined) {
            throw new errors.IncorrectUsageError({message: 'Attempted to setup a periodic max limit without a limit'});
        }

        if (!config.currentCountQuery) {
            throw new errors.IncorrectUsageError({message: 'Attempted to setup a periodic max limit without a current count query'});
        }

        if (!config.interval) {
            throw new errors.IncorrectUsageError({message: 'Attempted to setup a periodic max limit without an interval'});
        }

        if (!SUPPORTED_INTERVALS.includes(config.interval)) {
            throw new errors.IncorrectUsageError({message: `Attempted to setup a periodic max limit without unsupported interval. Please specify one of: ${SUPPORTED_INTERVALS}`});
        }

        if (!config.startDate) {
            throw new errors.IncorrectUsageError({message: 'Attempted to setup a periodic max limit without a start date'});
        }

        this.currentCountQueryFn = config.currentCountQuery;
        this.maxPeriodic = config.maxPeriodic;
        this.interval = config.interval;
        this.startDate = config.startDate;
        this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
    }

    generateError(count) {
        let errorObj = super.generateError();

        errorObj.message = this.fallbackMessage;

        if (this.error) {
            try {
                errorObj.message = template(this.error, {interpolate})(
                    {
                        max: Intl.NumberFormat().format(this.maxPeriodic),
                        count: Intl.NumberFormat().format(count),
                        name: this.name
                    });
            } catch (e) {
                errorObj.message = this.fallbackMessage;
            }
        }

        errorObj.errorDetails.limit = this.maxPeriodic;
        errorObj.errorDetails.total = count;

        return new this.errors.HostLimitError(errorObj);
    }

    /**
     * @param {Object} [options]
     * @param {Object} [options.transacting] Transaction to run the count query on
     * @returns
     */
    async currentCountQuery(options = {}) {
        const lastPeriodStartDate = lastPeriodStart(this.startDate, this.interval);

        return await this.currentCountQueryFn(options.transacting ? options.transacting : (this.db ? this.db.knex : undefined), lastPeriodStartDate);
    }

    /**
     * Throws a HostLimitError if the configured or passed max limit is acceded by currentCountQuery
     *
     * @param {Object} options
     * @param {Number} [options.max] - overrides configured default maxPeriodic value to perform checks against
     * @param {Number} [options.addedCount] - number of items to add to the currentCount during the check
     * @param {Object} [options.transacting] Transaction to run the count query on
     */
    async errorIfWouldGoOverLimit(options = {}) {
        const {max, addedCount = 1} = options;
        let currentCount = await this.currentCountQuery(options);

        if ((currentCount + addedCount) > (max || this.maxPeriodic)) {
            throw this.generateError(currentCount);
        }
    }

    /**
     * Throws a HostLimitError if the configured or passed max limit is acceded by currentCountQuery
     *
     * @param {Object} options
     * @param {Number} [options.max] - overrides configured default maxPeriodic value to perform checks against
     * @param {Object} [options.transacting] Transaction to run the count query on
     */
    async errorIfIsOverLimit(options = {}) {
        const {max} = options;
        let currentCount = await this.currentCountQuery(options);

        if (currentCount > (max || this.maxPeriodic)) {
            throw this.generateError(currentCount);
        }
    }
}

class FlagLimit extends Limit {
    /**
     *
     * @param {Object} options
     * @param {String} options.name - name of the limit
     * @param {Object} options.config - limit configuration
     * @param {Number} options.config.disabled - disabled/enabled flag for the limit
     * @param {String} options.config.error - error message to use when limit is reached
     * @param {String} options.helpLink - URL to the resource explaining how the limit works
     * @param {Object} [options.db] - instance of knex db connection that currentCountQuery can use to run state check through
     * @param {Object} options.errors - instance of errors compatible with GhostError errors (@tryghost/errors)
     */
    constructor({name, config, helpLink, db, errors}) {
        super({name, error: config.error || '', helpLink, db, errors});

        this.disabled = config.disabled;
        this.fallbackMessage = `Your plan does not support ${lowerCase(this.name)}. Please upgrade to enable ${lowerCase(this.name)}.`;
    }

    generateError() {
        let errorObj = super.generateError();

        if (this.error) {
            errorObj.message = this.error;
        } else {
            errorObj.message = this.fallbackMessage;
        }

        return new this.errors.HostLimitError(errorObj);
    }

    /**
     * Flag limits are on/off so using a feature is always over the limit
     */
    async errorIfWouldGoOverLimit() {
        if (this.disabled) {
            throw this.generateError();
        }
    }

    /**
     * Flag limits are on/off. They don't necessarily mean the limit wasn't possible to reach
     * NOTE: this method should not be relied on as it's impossible to check the limit was surpassed!
     */
    async errorIfIsOverLimit() {
        return;
    }
}

class AllowlistLimit extends Limit {
    /**
     *
     * @param {Object} options
     * @param {String} options.name - name of the limit
     * @param {Object} options.config - limit configuration
     * @param {[String]} options.config.allowlist - allowlist values that would be compared against
     * @param {String} options.config.error - error message to use when limit is reached
     * @param {String} options.helpLink - URL to the resource explaining how the limit works
     * @param {Object} options.errors - instance of errors compatible with GhostError errors (@tryghost/errors)
     */
    constructor({name, config, helpLink, errors}) {
        super({name, error: config.error || '', helpLink, errors});

        if (!config.allowlist || !config.allowlist.length) {
            throw new this.errors.IncorrectUsageError({message: 'Attempted to setup an allowlist limit without an allowlist'});
        }

        this.allowlist = config.allowlist;
        this.fallbackMessage = `This action would exceed the ${lowerCase(this.name)} limit on your current plan.`;
    }

    generateError() {
        let errorObj = super.generateError();

        if (this.error) {
            errorObj.message = this.error;
        } else {
            errorObj.message = this.fallbackMessage;
        }

        return new this.errors.HostLimitError(errorObj);
    }

    async errorIfWouldGoOverLimit(metadata) {
        if (!metadata || !metadata.value) {
            throw new this.errors.IncorrectUsageError({message: 'Attempted to check an allowlist limit without a value'});
        }
        if (!this.allowlist.includes(metadata.value)) {
            throw this.generateError();
        }
    }

    async errorIfIsOverLimit(metadata) {
        if (!metadata || !metadata.value) {
            throw new this.errors.IncorrectUsageError({message: 'Attempted to check an allowlist limit without a value'});
        }
        if (!this.allowlist.includes(metadata.value)) {
            throw this.generateError();
        }
    }
}

module.exports = {
    MaxLimit,
    MaxPeriodicLimit,
    FlagLimit,
    AllowlistLimit
};
