const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    couldNotGenerateSlug: 'Could not generate slug.'
};

const allowedTypes = {
    post: models.Post,
    tag: models.Tag,
    user: models.User
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'slugs',
    generate: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'type',
            'id'
        ],
        data: [
            'name'
        ],
        permissions: true,
        validation: {
            options: {
                type: {
                    required: true,
                    values: Object.keys(allowedTypes)
                },
                id: {
                    required: false
                }
            },
            data: {
                name: {
                    required: true
                }
            }
        },
        async query(frame) {
            const slug = await models.Base.Model.generateSlug(allowedTypes[frame.options.type], frame.data.name, {status: 'all', modelId: frame.options.id});
            if (!slug) {
                throw new errors.InternalServerError({
                    message: tpl(messages.couldNotGenerateSlug)
                });
            }
            return slug;
        }
    }
};

module.exports = controller;
