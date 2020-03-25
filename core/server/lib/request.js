var got = require('got'),
    _ = require('lodash'),
    validator = require('../data/validation').validator,
    errors = require('@tryghost/errors'),
    ghostVersion = require('./ghost-version');

var defaultOptions = {
    headers: {
        'user-agent': 'Ghost/' + ghostVersion.original + ' (https://github.com/TryGhost/Ghost)'
    }
};

module.exports = function request(url, options) {
    if (_.isEmpty(url) || !validator.isURL(url)) {
        return Promise.reject(new errors.InternalServerError({
            message: 'URL empty or invalid.',
            code: 'URL_MISSING_INVALID',
            context: url
        }));
    }

    var mergedOptions = _.merge({}, defaultOptions, options);

    return got(url, mergedOptions);
};
