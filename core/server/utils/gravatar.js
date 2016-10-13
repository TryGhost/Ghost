var Promise = require('bluebird'),
    config = require('../config'),
    crypto = require('crypto'),
    https = require('https');

module.exports.lookup = function lookup(userData, timeout) {
    var gravatarUrl = '//www.gravatar.com/avatar/' +
        crypto.createHash('md5').update(userData.email.toLowerCase().trim()).digest('hex') +
        '?s=250', image;

    return new Promise(function gravatarRequest(resolve) {
        /**
         * @TODO:
         *  - mock gravatar in test env globally, do not check for test env!
         *  - in test/utils/index.js -> mocks.gravatar.enable();
         */
        if (config.isPrivacyDisabled('useGravatar') || config.get('env').indexOf('testing') > -1) {
            return resolve();
        }

        var request, timer, timerEnded = false;

        request = https.get('https:' + gravatarUrl + '&d=404&r=x', function (response) {
            clearTimeout(timer);

            if (response.statusCode !== 404 && !timerEnded) {
                gravatarUrl += '&d=mm&r=x';
                image = gravatarUrl;
            }

            resolve({image: image});
        });

        request.on('error', function () {
            clearTimeout(timer);

            // just resolve with no image url
            if (!timerEnded) {
                return resolve();
            }
        });

        timer = setTimeout(function () {
            timerEnded = true;
            request.abort();
            return resolve();
        }, timeout || 2000);
    });
};
