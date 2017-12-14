var Promise = require('bluebird'),
    crypto = require('crypto'),
    config = require('../../config'),
    request = require('../request');

module.exports.lookup = function lookup(userData, timeout) {
    var gravatarUrl = '//www.gravatar.com/avatar/' +
        crypto.createHash('md5').update(userData.email.toLowerCase().trim()).digest('hex') +
        '?s=250';

    if (config.isPrivacyDisabled('useGravatar')) {
        return Promise.resolve();
    }

    return request('https:' + gravatarUrl + '&d=404&r=x', {timeout: timeout || 2 * 1000})
        .then(function () {
            gravatarUrl += '&d=mm&r=x';

            return {
                image: gravatarUrl
            };
        })
        .catch({statusCode: 404}, function () {
            return {
                image: undefined
            };
        })
        .catch(function () {
            // ignore error, just resolve with no image url
        });
};
