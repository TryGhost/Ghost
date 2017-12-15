var got = require('got'),
    _ = require('lodash'),
    validator = require('../data/validation').validator,
    common = require('./common');

module.exports = function request(url, options) {
    if (_.isEmpty(url) || !validator.isURL(url)) {
        return Promise.reject(new common.errors.InternalServerError({
            message: 'URL empty or invalid.',
            code: 'URL_MISSING_INVALID',
            context: url
        }));
    }

    return got(url, options);
};
