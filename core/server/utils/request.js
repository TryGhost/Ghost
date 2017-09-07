var got = require('got'),
    Promise = require('bluebird'),
    validator = require('../data/validation').validator,
    errors = require('../errors'),
    _  = require('lodash');

module.exports = function request(url, options) {
    if (_.isEmpty(url) || !validator.isURL(url)) {
        return Promise.reject(new errors.InternalServerError({
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
