const _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    models = require('../../../../models'),
    message1 = 'Removing `koenigEditor` from labs.',
    message2 = 'Removed `koenigEditor` from labs.',
    message3 = 'Rollback: Please re-enable König Beta if required. We can\'t rollback this change.';

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    return models.Settings.findOne({key: 'labs'}, localOptions)
        .then(function (settingsModel) {
            if (!settingsModel) {
                common.logging.warn('Labs field does not exist.');
                return;
            }

            const labsValue = JSON.parse(settingsModel.get('value'));
            delete labsValue.koenigEditor;

            common.logging.info(message1);
            return models.Settings.edit({
                key: 'labs',
                value: JSON.stringify(labsValue)
            }, localOptions);
        })
        .then(() => {
            common.logging.info(message2);
        });
};

module.exports.down = () => {
    common.logging.warn(message3);
    return Promise.resolve();
};
