const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');

const messages = {
    emailTemplateNotFound: 'Email template not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'email_templates',

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'slug'
        ],
        permissions: true,
        async query(frame) {
            const model = await models.EmailTemplate.findOne({slug: frame.data.slug}, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.emailTemplateNotFound)
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
            'slug'
        ],
        validation: {
            options: {
                slug: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const existing = await models.EmailTemplate.findOne({slug: frame.options.slug}, frame.options);
            if (!existing) {
                throw new errors.NotFoundError({
                    message: tpl(messages.emailTemplateNotFound)
                });
            }

            const data = frame.data.email_templates[0];
            const model = await models.EmailTemplate.edit(data, {
                ...frame.options,
                id: existing.id
            });

            return model;
        }
    }
};

module.exports = controller;
