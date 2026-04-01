const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');

const messages = {
    emailDesignSettingNotFound: 'Email design setting not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'email_design_settings',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter',
            'fields',
            'limit',
            'order',
            'page'
        ],
        permissions: true,
        query(frame) {
            return models.EmailDesignSetting.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'filter',
            'fields'
        ],
        data: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            const model = await models.EmailDesignSetting.findOne(frame.data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.emailDesignSettingNotFound)
                });
            }

            return model;
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const data = frame.data.email_design_settings[0];
            const model = await models.EmailDesignSetting.edit(data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.emailDesignSettingNotFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
