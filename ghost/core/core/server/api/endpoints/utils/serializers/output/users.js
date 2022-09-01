const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:users');
const tpl = require('@tryghost/tpl');

const messages = {
    pwdChangedSuccessfully: 'Password changed successfully.'
};

module.exports = {
    destroy(filename, apiConfig, frame) {
        debug('destroy');

        frame.response = {
            meta: {
                filename: filename
            }
        };
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
    },

    readToken(model, apiConfig, frame) {
        debug('readToken');

        frame.response = {
            apiKey: model.toJSON(frame.options)
        };
    },

    regenerateToken(model, apiConfig, frame) {
        debug('regenerateToken');

        frame.response = {
            apiKey: model.toJSON(frame.options)
        };
    }

};
