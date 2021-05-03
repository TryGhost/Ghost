const Promise = require('bluebird');
const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');
const models = require('../../models');

const ALLOWED_INCLUDES = ['count.posts'];

module.exports = {
    docName: 'tags',

    browse: {
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
        query(frame) {
            return models.TagPublic.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new errors.NotFoundError({
                            message: i18n.t('errors.api.tags.tagNotFound')
                        }));
                    }

                    return model;
                });
        }
    }
};
