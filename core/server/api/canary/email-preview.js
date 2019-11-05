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
            const options = Object.assign(frame.options, {formats: 'html,plaintext'});
            return models.Post.findOne(frame.data, options)
                .then((model) => {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        });
                    }

                    const post = model.toJSON(options);

                    return mega.postEmailSerializer.serialize(post);
                });
        }
    },
    sendTestEmail: {
        statusCode: 200,
        headers: {},
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
        permissions: false,
        async query(frame) {
            let model = await models.Post.findOne(frame.options);
            if (!model) {
                throw new common.errors.NotFoundError({
                    message: common.i18n.t('errors.api.posts.postNotFound')
                });
            }
            const post = model.toJSON();
            const {emails = []} = frame.data;
            return mega.mega.sendTestEmail(post, emails);
        }
    }
};
