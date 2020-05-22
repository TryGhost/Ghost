const Promise = require('bluebird');
const {i18n} = require('../../../../../lib/common');
const errors = require('@tryghost/errors');
const models = require('../../../../../models');

module.exports = {
    add(apiConfig, frame) {
        return models.User.findOne({email: frame.data.invites[0].email}, frame.options)
            .then((user) => {
                if (user) {
                    return Promise.reject(new errors.ValidationError({
                        message: i18n.t('errors.api.users.userAlreadyRegistered')
                    }));
                }
            });
    }
};
