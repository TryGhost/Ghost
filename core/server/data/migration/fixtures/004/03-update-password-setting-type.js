// Update the `password` setting, so that it has a type of `private` rather than `blog`
var models  = require('../../../../models'),
    Promise = require('bluebird');

module.exports = function updatePasswordSetting(options, logInfo) {
    return models.Settings.findOne('password').then(function (setting) {
        if (setting) {
            logInfo('Update password setting');
            return models.Settings.edit({key: 'password', type: 'private'}, options);
        }
        return Promise.resolve();
    });
};
