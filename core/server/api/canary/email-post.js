const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');
const models = require('../../models');
const ALLOWED_INCLUDES = ['authors', 'tags'];

module.exports = {
    docName: 'email_post',

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
        async query(frame) {
            const model = await models.Post.findOne(Object.assign(frame.data, {status: 'sent'}), frame.options);

            if (!model) {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.posts.postNotFound')
                });
            }

            return model;
        }
    }
};
