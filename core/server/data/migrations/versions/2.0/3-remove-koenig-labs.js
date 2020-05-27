const _ = require('lodash');
const Promise = require('bluebird');
const logging = require('../../../../../shared/logging');
const models = require('../../../../models');
const message1 = 'Removing `koenigEditor` from labs.';
const message2 = 'Removed `koenigEditor` from labs.';
const message3 = 'Rollback: Please re-enable König Beta if required. We can\'t rollback this change.';

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
                logging.warn('Labs field does not exist.');
                return;
            }

            const labsValue = JSON.parse(settingsModel.get('value'));
            delete labsValue.koenigEditor;

            logging.info(message1);
            return models.Settings.edit({
                key: 'labs',
                value: JSON.stringify(labsValue)
            }, localOptions);
        })
        .then(() => {
            logging.info(message2);
        });
};

module.exports.down = () => {
    logging.warn(message3);
    return Promise.resolve();
};
