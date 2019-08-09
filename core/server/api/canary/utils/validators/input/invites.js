const Promise = require('bluebird');
const common = require('../../../../../lib/common');
const models = require('../../../../../models');

module.exports = {
    add(apiConfig, frame) {
        return models.User.findOne({email: frame.data.invites[0].email}, frame.options)
            .then((user) => {
                if (user) {
                    return Promise.reject(new common.errors.ValidationError({
                        message: common.i18n.t('errors.api.users.userAlreadyRegistered')
                    }));
                }
            });
    }
};
