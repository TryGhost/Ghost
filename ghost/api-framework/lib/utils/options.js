const _ = require('lodash');
const {IncorrectUsageError} = require('@tryghost/errors');

/**
 * @description Helper function to prepare params for internal usages.
 *
 * e.g. "a,B,c" -> ["a", "b", "c"]
 *
 * @param {String} params
 * @return {Array}
 */
const trimAndLowerCase = (params) => {
    params = params || '';

    if (_.isString(params)) {
        params = params.split(',');
    }

    // If we don't have an array at this point, something is wrong, so we should throw an
    // error to avoid trying to .map over something else
    if (!_.isArray(params)) {
        throw new IncorrectUsageError({
            message: 'Params must be a string or array'
        });
    }

    return params.map((item) => {
        return item.trim().toLowerCase();
    });
};

module.exports.trimAndLowerCase = trimAndLowerCase;
