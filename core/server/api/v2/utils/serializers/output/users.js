const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:users');
const common = require('../../../../../lib/common');
const urlService = require('../../../../../services/url');

const absoluteUrls = (user) => {
    user.url = urlService.getUrlByResourceId(user.id, {absolute: true});

    if (user.profile_image) {
        user.profile_image = urlService.utils.urlFor('image', {image: user.profile_image}, true);
    }

    if (user.cover_image) {
        user.cover_image = urlService.utils.urlFor('image', {image: user.cover_image}, true);
    }

    return user;
};

module.exports = {
    browse(models, apiConfig, frame) {
        debug('browse');

        frame.response = {
            users: models.data.map(model => absoluteUrls(model.toJSON(frame.options))),
            meta: models.meta
        };

        debug(frame.response);
    },

    read(model, apiConfig, frame) {
        debug('read');

        frame.response = {
            users: [absoluteUrls(model.toJSON(frame.options))]
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
