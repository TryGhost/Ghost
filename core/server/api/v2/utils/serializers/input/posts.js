const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:posts');
const url = require('./utils/url');
const utils = require('../../index');
const labs = require('../../../../../services/labs');

function removeMobiledocFormat(frame) {
    if (frame.options.formats && frame.options.formats.includes('mobiledoc')) {
        frame.options.formats = frame.options.formats.filter((format) => {
            return (format !== 'mobiledoc');
        });
    }
}

function includeTags(frame) {
    if (!frame.options.withRelated) {
        frame.options.withRelated = ['tags'];
    } else if (!frame.options.withRelated.includes('tags')) {
        frame.options.withRelated.push('tags');
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        // @TODO: `api_key_id` does not work long term, because it can be either a content or an admin api key?
        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key_id exists? content api access
         * - user exists? admin api access
         */
        if (utils.isContentAPI(frame)) {
            /**
             * CASE:
             *
             * - the content api endpoints for posts should only return non page type resources
             * - we have to enforce the filter
             *
             * @TODO: https://github.com/TryGhost/Ghost/issues/10268
             */
            if (frame.options.filter) {
                frame.options.filter = `${frame.options.filter}+page:false`;
            } else {
                frame.options.filter = 'page:false';
            }

            // CASE: the content api endpoint for posts should not return mobiledoc
            removeMobiledocFormat(frame);

            // CASE: Members needs to have the tags to check if its allowed access
            if (labs.isSet('members')) {
                includeTags(frame);
            }
        }

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        // @TODO: `api_key_id` does not work long term, because it can be either a content or an admin api key?
        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key_id exists? content api access
         * - user exists? admin api access
         */
        if (utils.isContentAPI(frame)) {
            frame.data.page = false;
            // CASE: the content api endpoint for posts should not return mobiledoc
            removeMobiledocFormat(frame);
            if (labs.isSet('members')) {
                // CASE: Members needs to have the tags to check if its allowed access
                includeTags(frame);
            }
        }

        debug(frame.options);
    },

    add(apiConfig, frame) {
        debug('add');
        /**
         * Convert author property to author_id to match the name in the database.
         *
         * @deprecated: `author`, might be removed in Ghost 3.0
         */
        if (frame.data.posts[0].hasOwnProperty('author')) {
            // @TODO: remove + deny
            frame.data.posts[0].author_id = frame.data.posts[0].author;
            delete frame.data.posts[0].author;
        }

        /**
         * CASE: we don't support updating nested-nested relations e.g. `post.authors[*].roles` yet.
         *
         * Bookshelf-relations supports this feature, BUT bookshelf's `hasChanged` fn will currently
         * clash with this, because `hasChanged` won't be able to tell if relations have changed or not.
         * It would always return `changed.roles = [....]`. It would always throw a model event that relations
         * were updated, which is not true.
         *
         * Bookshelf-relations can tell us if a relation has changed, it knows that.
         * But the connection between our model layer, Bookshelf's `hasChanged` fn and Bookshelf-relations
         * is not present. As long as we don't support this case, we have to ignore this.
         */
        if (frame.data.posts[0].authors && frame.data.posts[0].authors.length) {
            _.each(frame.data.posts[0].authors, (author, index) => {
                if (author.hasOwnProperty('roles')) {
                    delete frame.data.posts[0].authors[index].roles;
                }

                if (author.hasOwnProperty('permissions')) {
                    delete frame.data.posts[0].authors[index].permissions;
                }
            });
        }

        /**
         * Model notation is: `tag.parent_id`.
         * The API notation is `tag.parent`.
         */
        if (frame.data.posts[0].hasOwnProperty('tags')) {
            if (_.isArray(frame.data.posts[0].tags) && frame.data.posts[0].tags.length) {
                _.each(frame.data.posts[0].tags, (tag, index) => {
                    if (tag.hasOwnProperty('parent')) {
                        frame.data.posts[0].tags[index].parent_id = tag.parent;
                        delete frame.data.posts[0].tags[index].parent;
                    }

                    if (tag.hasOwnProperty('posts')) {
                        delete frame.data.posts[0].tags[index].posts;
                    }
                });
            }
        }

        frame.data.posts[0] = url.forPost(Object.assign({}, frame.data.posts[0]), frame.options);
    },

    edit(apiConfig, frame) {
        this.add(apiConfig, frame);
    }
};
