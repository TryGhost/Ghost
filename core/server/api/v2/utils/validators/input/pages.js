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
            if (!frame.data.pages[0].hasOwnProperty('authors')) {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('notices.data.validation.index.validationFailed', {
                        validationName: 'FieldIsRequired',
                        key: '"authors"'
                    })
                }));
            }
        }

        /**
         * Ensure correct incoming `page.authors` structure.
         *
         * NOTE:
         * The `page.authors[*].id` attribute is required till we release Ghost 3.0.
         * Ghost 1.x keeps the deprecated support for `page.author_id`, which is the primary author id and needs to be
         * updated if the order of the `page.authors` array changes.
         * If we allow adding authors via the page endpoint e.g. `authors=[{name: 'newuser']` (no id property), it's hard
             * to update the primary author id (`page.author_id`), because the new author `id` is generated when attaching
             * the author to the page. And the attach operation happens in bookshelf-relations, which happens after
             * the event handling in the page model.
             *
             * It's solvable, but not worth right now solving, because the admin UI does not support this feature.
             *
             * TLDR; You can only attach existing authors to a page.
             *
         * @TODO: remove `id` restriction in Ghost 3.0
         */
        const schema = require(`./schemas/pages-add`);
        const definitions = require('./schemas/pages');
        return jsonSchema.validate(schema, definitions, frame.data);
    },

    edit(apiConfig, frame) {
        const schema = require(`./schemas/pages-edit`);
        const definitions = require('./schemas/pages');
        return jsonSchema.validate(schema, definitions, frame.data);
    }
};
