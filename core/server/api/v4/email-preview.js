const models = require('../../models');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
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
            'id',
            'status'
        ],
        permissions: true,
        query(frame) {
            const options = Object.assign(frame.options, {formats: 'html,plaintext', withRelated: ['authors', 'posts_meta']});
            const data = Object.assign(frame.data, {status: 'all'});
            return models.Post.findOne(data, options)
                .then((model) => {
                    if (!model) {
                        throw new errors.NotFoundError({
                            message: i18n.t('errors.api.posts.postNotFound')
                        });
                    }

                    return mega.postEmailSerializer.serialize(model, {isBrowserPreview: true}).then((emailContent) => {
                        const replacements = mega.postEmailSerializer.parseReplacements(emailContent);

                        replacements.forEach((replacement) => {
                            emailContent[replacement.format] = emailContent[replacement.format].replace(
                                replacement.match,
                                replacement.fallback || ''
                            );
                        });

                        return emailContent;
                    });
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
        permissions: true,
        async query(frame) {
            const options = Object.assign(frame.options, {status: 'all'});
            let model = await models.Post.findOne(options, {withRelated: ['authors']});
            if (!model) {
                throw new errors.NotFoundError({
                    message: i18n.t('errors.api.posts.postNotFound')
                });
            }
            const {emails = []} = frame.data;
            const response = await mega.mega.sendTestEmail(model, emails);
            if (response && response[0] && response[0].error) {
                throw new errors.EmailError({
                    statusCode: response[0].error.statusCode,
                    message: response[0].error.message,
                    context: response[0].error.originalMessage
                });
            }
            return response;
        }
    }
};
