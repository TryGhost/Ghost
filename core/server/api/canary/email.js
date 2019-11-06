const models = require('../../models');
const common = require('../../lib/common');

module.exports = {
    docName: 'emails',

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
            return models.Email.findOne(frame.data, frame.options)
                .then((model) => {
                    if (!model) {
                        throw new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.email.emailNotFound')
                        });
                    }

                    return model.toJSON(frame.options);
                });
        }
    }
};
