const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:users');
const common = require('../../../../../lib/common');
const url = require('./utils/url');

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            users: models.data.map(model => url.forUser(model.id, model.toJSON(frame.options), frame.options)),
            meta: models.meta
        };

        debug(frame.response);
    },

    read(model, apiConfig, frame) {
        debug('read');

        frame.response = {
            users: [url.forUser(model.id, model.toJSON(frame.options), frame.options)]
        };

        debug(frame.response);
    },

    edit() {
        debug('edit');
        this.read(...arguments);
    },

    changePassword(models, apiConfig, frame) {
        debug('changePassword');

        frame.response = {
            password: [{message: common.i18n.t('notices.api.users.pwdChangedSuccessfully')}]
        };
    },

    transferOwnership(models, apiConfig, frame) {
        debug('transferOwnership');

        frame.response = {
            users: models.map(model => model.toJSON(frame.options))
        };

        debug(frame.response);
    }
};
