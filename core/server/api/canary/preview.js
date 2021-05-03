const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ALLOWED_INCLUDES = ['authors', 'tags'];

module.exports = {
    docName: 'preview',

    read: {
        permissions: true,
        options: [
            'include'
        ],
        data: [
            'uuid'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            },
            data: {
                uuid: {
                    required: true
                }
            }
        },
        query(frame) {
            return models.Post.findOne(Object.assign({status: 'all'}, frame.data), frame.options)
                .then((model) => {
                    if (!model) {
                        throw new errors.NotFoundError({
                            message: i18n.t('errors.api.posts.postNotFound')
                        });
                    }

                    return model;
                });
        }
    }
};
