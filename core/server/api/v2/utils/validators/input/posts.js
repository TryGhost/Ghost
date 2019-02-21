const Promise = require('bluebird');
const common = require('../../../../../lib/common');
const utils = require('../../index');
const jsonSchema = require('../utils/json-schema');

module.exports = {
    add(apiConfig, frame) {
        /**
         * @NOTE:
         *
         * Session authentication does not require authors, because the logged in user
         * becomes the primary author.
         *
         * Admin API key requires sending authors, because there is no user id.
         */
        if (utils.isAdminAPIKey(frame)) {
            if (!frame.data.posts[0].hasOwnProperty('authors')) {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('notices.data.validation.index.validationFailed', {
                        validationName: 'FieldIsRequired',
                        key: '"authors"'
                    })
                }));
            }
        }

        const schema = require(`./schemas/posts-add`);
        const definitions = require('./schemas/posts');
        return jsonSchema.validate(schema, definitions, frame.data);
    },

    edit(apiConfig, frame) {
        const schema = require(`./schemas/posts-edit`);
        const definitions = require('./schemas/posts');
        return jsonSchema.validate(schema, definitions, frame.data);
    }
};
