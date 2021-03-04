const errors = require('@tryghost/errors');

// run in context allows us to change the templateSettings without causing havoc
const _ = require('lodash').runInContext();
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

class Limit {
    constructor({name, error, helpLink, db}) {
        this.name = name;
        this.error = error;
        this.helpLink = helpLink;
        this.db = db;
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
    constructor({name, config, helpLink, db}) {
        super({name, error: config.error || '', helpLink, db});

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

        return new errors.HostLimitError(errorObj);
    }

    async currentCountQuery() {
        return await this.currentCountQueryFn(this.db);
    }

    async errorIfWouldGoOverLimit() {
        let currentCount = await this.currentCountQuery(this.db);
        if ((currentCount + 1) > this.max) {
            throw this.generateError(currentCount);
        }
    }
    async errorIfIsOverLimit() {
        let currentCount = await this.currentCountQuery(this.db);
        if (currentCount > this.max) {
            throw this.generateError(currentCount);
        }
    }
}

class FlagLimit extends Limit {
    constructor({name, config, helpLink, db}) {
        super({name, error: config.error || '', helpLink, db});

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

        return new errors.HostLimitError(errorObj);
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
     * Flag limits are on/off so we can't be over the limit
     */
    async errorIfIsOverLimit() {
        return;
    }
}

module.exports = {
    MaxLimit,
    FlagLimit
};
