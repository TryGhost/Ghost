const Promise = require('bluebird');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../../../../models');

const messages = {
    userAlreadyRegistered: 'User is already registered.'
};

module.exports = {
    add(apiConfig, frame) {
        return models.User.findOne({email: frame.data.invites[0].email}, frame.options)
            .then((user) => {
                if (user) {
                    return Promise.reject(new errors.ValidationError({
                        message: tpl(messages.userAlreadyRegistered)
                    }));
                }
            });
    }
};
