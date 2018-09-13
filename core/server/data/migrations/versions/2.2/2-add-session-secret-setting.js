const crypto = require('crypto'),
    common = require('../../../../lib/common'),
    models = require('../../../../models'),
    createdMessage = 'Created Settings Key `session-secret`.',
    deletedMessage = 'Deleted Settings Key `session-secret`.';

module.exports.up = () => {
    return models.Settings.findOne({key: 'session-secret'})
        .then((model) => {
            if (model) {
                common.logging.warn(createdMessage);
                return;
            }
            common.logging.info(createdMessage);
            return models.Settings.forge({
                key: 'session-secret',
                value: crypto.randomBytes(32).toString('hex')
            }).save();
        });
};

module.exports.down = () => {
    return models.Settings.findOne({key: 'session-secret'})
        .then((model) => {
            if (!model) {
                common.logging.warn(deletedMessage);
                return;
            }
            common.logging.info(deletedMessage);
            return model.destroy();
        });
};

