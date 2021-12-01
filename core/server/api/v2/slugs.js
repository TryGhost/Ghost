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
                        return Promise.reject(new errors.InternalServerError({
                            message: tpl(messages.couldNotGenerateSlug)
                        }));
                    }
                    return slug;
                });
        }
    }
};
