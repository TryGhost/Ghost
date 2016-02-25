// Update the `isPrivate` setting, so that it has a type of `private` rather than `blog`
var models  = require('../../../../models'),
    Promise = require('bluebird');

module.exports = function updatePrivateSetting(options, logInfo) {
    return models.Settings.findOne('isPrivate').then(function (setting) {
        if (setting) {
            logInfo('Update isPrivate setting');
            return models.Settings.edit({key: 'isPrivate', type: 'private'}, options);
        }
        return Promise.resolve();
    });
};
