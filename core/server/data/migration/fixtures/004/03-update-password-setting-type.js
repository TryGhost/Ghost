// Update the `password` setting, so that it has a type of `private` rather than `blog`
var models  = require('../../../../models'),
    message = 'Update password setting';

module.exports = function updatePasswordSetting(options, logger) {
    return models.Settings.findOne('password', options).then(function (setting) {
        if (setting && setting.get('type') !== 'private') {
            logger.info(message);
            return models.Settings.edit({key: 'password', type: 'private'}, options);
        } else {
            logger.warn(message);
        }
    });
};
