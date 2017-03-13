var passport = require('passport'),
    Promise = require('bluebird');

module.exports.getUser = function getUser(options) {
    options = options || {};

    var id = options.id,
        ghostOAuth2Strategy = passport._strategies.ghost;

    return new Promise(function (resolve, reject) {
        ghostOAuth2Strategy.userProfileByIdentityId(id, function (err, profile) {
            if (err) {
                return reject(err);
            }

            resolve(profile);
        });
    });
};
