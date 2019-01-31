const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../../lib/common');
const utils = require('../../index');

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

        /**
         * Ensure correct incoming `post.authors` structure.
         *
         * NOTE:
         * The `post.authors[*].id` attribute is required till we release Ghost 3.0.
         * Ghost 1.x keeps the deprecated support for `post.author_id`, which is the primary author id and needs to be
         * updated if the order of the `post.authors` array changes.
         * If we allow adding authors via the post endpoint e.g. `authors=[{name: 'newuser']` (no id property), it's hard
             * to update the primary author id (`post.author_id`), because the new author `id` is generated when attaching
             * the author to the post. And the attach operation happens in bookshelf-relations, which happens after
             * the event handling in the post model.
             *
             * It's solvable, but not worth right now solving, because the admin UI does not support this feature.
             *
             * TLDR; You can only attach existing authors to a post.
             *
         * @TODO: remove `id` restriction in Ghost 3.0
         */
        if (frame.data.posts[0].hasOwnProperty('authors')) {
            if (!_.isArray(frame.data.posts[0].authors) ||
                (frame.data.posts[0].authors.length && _.filter(frame.data.posts[0].authors, 'id').length !== frame.data.posts[0].authors.length)) {
                return Promise.reject(new common.errors.BadRequestError({
                    message: common.i18n.t('errors.api.utils.invalidStructure', {key: 'posts[*].authors'})
                }));
            }
        }
    },

    edit(apiConfig, frame) {
        if (frame.data.posts[0].hasOwnProperty('authors')) {
            if (!_.isArray(frame.data.posts[0].authors) ||
                (frame.data.posts[0].authors.length && _.filter(frame.data.posts[0].authors, 'id').length !== frame.data.posts[0].authors.length)) {
                return Promise.reject(new common.errors.BadRequestError({
                    message: common.i18n.t('errors.api.utils.invalidStructure', {key: 'posts[*].authors'})
                }));
            }
        }
    }
};
