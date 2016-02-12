var Promise = require('bluebird'),
    config = require('../config'),
    crypto = require('crypto'),
    https = require('https');

module.exports.lookup = function lookup(userData, timeout) {
    var gravatarUrl = '//www.gravatar.com/avatar/' +
        crypto.createHash('md5').update(userData.email.toLowerCase().trim()).digest('hex') +
        '?s=250';

    return new Promise(function gravatarRequest(resolve) {
        if (config.isPrivacyDisabled('useGravatar') || process.env.NODE_ENV.indexOf('testing') > -1) {
            return resolve(userData);
        }

        var request, timer, timerEnded = false;

        request = https.get('https:' + gravatarUrl + '&d=404&r=x', function (response) {
            clearTimeout(timer);
            if (response.statusCode !== 404 && !timerEnded) {
                gravatarUrl += '&d=mm&r=x';
                userData.image = gravatarUrl;
            }

            resolve(userData);
        });

        request.on('error', function () {
            clearTimeout(timer);
            // just resolve with no image url
            if (!timerEnded) {
                return resolve(userData);
            }
        });

        timer = setTimeout(function () {
            timerEnded = true;
            request.abort();
            return resolve(userData);
        }, timeout || 2000);
    });
};
