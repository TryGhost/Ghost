const models = require('../../models');
const common = require('../../lib/common');
const mega = require('../../services/mega');

module.exports = {
    docName: 'email_preview',

    read: {
        options: [
            'fields'
        ],
        validation: {
            options: {
                fields: ['html', 'plaintext', 'subject']
            }
        },
        data: [
            'id'
        ],
        permissions: true,
        query(frame) {
            return models.Post.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        });
                    }

                    const post = model.toJSON();

                    return mega.postEmailSerializer.serialize(post);
                });
        }
    }
};
