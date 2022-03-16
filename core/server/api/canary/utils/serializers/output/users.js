const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:users');
const tpl = require('@tryghost/tpl');
const mappers = require('./mappers');

const messages = {
    pwdChangedSuccessfully: 'Password changed successfully.'
};

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            users: models.data.map(model => mappers.users(model, frame)),
            meta: models.meta
        };
    },

    read(model, apiConfig, frame) {
        debug('read');

        frame.response = {
            users: [mappers.users(model, frame)]
        };
    },

    edit() {
        debug('edit');
        this.read(...arguments);
    },

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
