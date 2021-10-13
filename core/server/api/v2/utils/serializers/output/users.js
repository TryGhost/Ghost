const debug = require('@tryghost/debug')('api:v2:utils:serializers:output:users');
const tpl = require('@tryghost/tpl');
const mapper = require('./utils/mapper');
const messages = {
    pwdChangedSuccessfully: 'Password changed successfully.'
};
module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            users: models.data.map(model => mapper.mapUser(model, frame)),
            meta: models.meta
        };
    },

    read(model, apiConfig, frame) {
        debug('read');

        frame.response = {
            users: [mapper.mapUser(model, frame)]
        };
    },

    edit() {
        debug('edit');
        this.read(...arguments);
    },

    changePassword(models, apiConfig, frame) {
        debug('changePassword');

        frame.response = {
            password: [{message: tpl(messages.pwdChangedSuccessfully)}]
        };
    },

    transferOwnership(models, apiConfig, frame) {
        debug('transferOwnership');

        frame.response = {
            users: models.map(model => model.toJSON(frame.options))
        };
    }
};
