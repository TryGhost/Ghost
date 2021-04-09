// run in context allows us to change the templateSettings without causing havoc
const _ = require('lodash').runInContext();
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

class Limit {
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
     * @param {String} options.helpLink - URL to the resource explaining how the limit works
     * @param {Object} options.db - instance of knex db connection that currentCountQuery can use to run state check through
     * @param {Object} options.errors - instance of errors compatible with Ghost-Ignition's errors (https://github.com/TryGhost/Ignition#errors)
     */
    constructor({name, config, helpLink, db, errors}) {
        super({name, error: config.error || '', helpLink, db, errors});

        if (config.max === undefined) {
            throw new errors.IncorrectUsageError('Attempted to setup a max limit without a limit');
        }

        if (!config.currentCountQuery) {
            throw new errors.IncorrectUsageError('Attempted to setup a max limit without a current count query');
        }

        this.currentCountQueryFn = config.currentCountQuery;
        this.max = config.max;
        this.fallbackMessage = `This action would exceed the ${_.lowerCase(this.name)} limit on your current plan.`;
    }

    generateError(count) {
        let errorObj = super.generateError();

        errorObj.message = this.fallbackMessage;

        if (this.error) {
            try {
                errorObj.message = _.template(this.error)(
                    {
                        max: Intl.NumberFormat().format(this.max),
                        count: Intl.NumberFormat().format(count)
                    });
            } catch (e) {
                errorObj.message = this.fallbackMessage;
            }
        }

        errorObj.errorDetails.limit = this.max;
        errorObj.errorDetails.total = count;

        return new this.errors.HostLimitError(errorObj);
    }

    async currentCountQuery() {
        return await this.currentCountQueryFn(this.db);
    }

    /**
     * Throws a HostLimitError if the configured or passed max limit is ecceded by currentCountQuery
     *
     * @param {Object} options
     * @param {Number} [options.max] - overrides configured default max value to perform checks against
     */
    async errorIfWouldGoOverLimit({max} = {}) {
        let currentCount = await this.currentCountQuery(this.db);

        if ((currentCount + 1) > (max || this.max)) {
            throw this.generateError(currentCount);
        }
    }

    /**
     * Throws a HostLimitError if the configured or passed max limit is ecceded by currentCountQuery
     *
     * @param {Object} options
     * @param {Number} [options.max] - overrides configured default max value to perform checks against
     */
    async errorIfIsOverLimit({max} = {}) {
        let currentCount = await this.currentCountQuery(this.db);

        if (currentCount > (max || this.max)) {
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
     * @param {String} options.helpLink - URL to the resource explaining how the limit works
     * @param {Object} options.db - instance of knex db connection that currentCountQuery can use to run state check through
     * @param {Object} options.errors - instance of errors compatible with Ghost-Ignition's errors (https://github.com/TryGhost/Ignition#errors)
     */
    constructor({name, config, helpLink, db, errors}) {
        super({name, error: config.error || '', helpLink, db, errors});

        this.disabled = config.disabled;
        this.fallbackMessage = `Your plan does not support ${_.lowerCase(this.name)}. Please upgrade to enable ${_.lowerCase(this.name)}.`;
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
    constructor({name, config, helpLink, errors}) {
        super({name, error: config.error || '', helpLink, errors});

        if (!config.allowlist || !config.allowlist.length) {
            throw new this.errors.IncorrectUsageError('Attempted to setup an allowlist limit without an allowlist');
        }

        this.allowlist = config.allowlist;
        this.fallbackMessage = `This action would exceed the ${_.lowerCase(this.name)} limit on your current plan.`;
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
        if (!metadata.value) {
            throw new this.errors.IncorrectUsageError('Attempted to check an allowlist limit without a value');
        }
        if (!this.allowlist.includes(metadata.value)) {
            throw this.generateError();
        }
    }

    async errorIfIsOverLimit(metadata) {
        if (!metadata.value) {
            throw new this.errors.IncorrectUsageError('Attempted to check an allowlist limit without a value');
        }
        if (!this.allowlist.includes(metadata.value)) {
            throw this.generateError();
        }
    }
}

module.exports = {
    MaxLimit,
    FlagLimit,
    AllowlistLimit
};
