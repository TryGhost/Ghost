const _ = require('lodash');

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

    return params.map((item) => {
        return item.trim().toLowerCase();
    });
};

module.exports.trimAndLowerCase = trimAndLowerCase;
