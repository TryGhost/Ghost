const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../../../../models');

const messages = {
    userAlreadyRegistered: 'User is already registered.'
};

module.exports = {
    async add(apiConfig, frame) {
        const user = await models.User.findOne({email: frame.data.invites[0].email}, frame.options);
        if (user) {
            throw new errors.ValidationError({
                message: tpl(messages.userAlreadyRegistered)
            });
        }
    }
};
