var got = require('got'),
    Promise = require('bluebird'),
    validator = require('../data/validation').validator,
    errors = require('../errors'),
    i18n = require('../i18n'),
    _  = require('lodash');

module.exports = function request(url, options) {
    if (_.isEmpty(url) || !validator.isURL(url)) {
        return Promise.reject(new errors.InternalServerError(
            i18n.t('errors.utils.request.message', {url: url})
        ));
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
