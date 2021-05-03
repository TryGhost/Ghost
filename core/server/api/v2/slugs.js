const models = require('../../models');
const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');

const allowedTypes = {
    post: models.Post,
    tag: models.Tag,
    user: models.User
};

module.exports = {
    docName: 'slugs',
    generate: {
        options: [
            'include',
            'type'
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
                }
            },
            data: {
                name: {
                    required: true
                }
            }
        },
        query(frame) {
            return models.Base.Model.generateSlug(allowedTypes[frame.options.type], frame.data.name, {status: 'all'})
                .then((slug) => {
                    if (!slug) {
                        return Promise.reject(new errors.GhostError({
                            message: i18n.t('errors.api.slugs.couldNotGenerateSlug')
                        }));
                    }
                    return slug;
                });
        }
    }
};
