const got = require('got');
const _ = require('lodash');
const validator = require('../data/validation').validator;
const errors = require('@tryghost/errors');
const ghostVersion = require('./ghost-version');

const defaultOptions = {
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

    const mergedOptions = _.merge({}, defaultOptions, options);

    return got(url, mergedOptions);
};
