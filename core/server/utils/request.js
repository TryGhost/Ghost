var got = require('got'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    validator = require('../data/validation').validator,
    common = require('../lib/common');

module.exports = function request(url, options) {
    if (_.isEmpty(url) || !validator.isURL(url)) {
        return Promise.reject(new common.errors.InternalServerError({
            message: 'URL empty or invalid.',
            code: 'URL_MISSING_INVALID',
            context: url
        }));
    }

    return new Promise(function (resolve, reject) {
        return got(
            url,
            options
        ).then(function (response) {
            return resolve(response);
        }).catch(function (err) {
            return reject(err);
        });
    });
};
