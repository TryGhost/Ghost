const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const tagsPublicService = require('../../services/tags-public');

const ALLOWED_INCLUDES = ['count.posts'];

const messages = {
    tagNotFound: 'Tag not found.'
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'tags',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        cache: tagsPublicService.api?.cache,
        options: [
            'include',
            'filter',
            'fields',
            'limit',
            'order',
            'page',
            'debug'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        query(frame) {
            return models.TagPublic.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'filter',
            'fields',
            'debug'
        ],
        data: [
            'id',
            'slug',
            'visibility'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        async query(frame) {
            const model = await models.TagPublic.findOne(frame.data, frame.options);
            if (!model) {
                throw new errors.NotFoundError({
                    message: tpl(messages.tagNotFound)
                });
            }

            return model;
        }
    }
};

module.exports = controller;
