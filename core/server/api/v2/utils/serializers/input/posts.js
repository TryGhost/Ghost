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

function setDefaultOrder(frame) {
    let includesOrderedRelations = false;

    if (frame.options.withRelated) {
        const orderedRelations = ['author', 'authors', 'tag', 'tags'];
        includesOrderedRelations = _.intersection(orderedRelations, frame.options.withRelated).length > 0;
    }

    if (!frame.options.order && !includesOrderedRelations) {
        frame.options.order = 'published_at desc';
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key.type == 'content' ? content api access
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
                frame.options.filter = `(${frame.options.filter})+page:false`;
            } else {
                frame.options.filter = 'page:false';
            }

            // CASE: the content api endpoint for posts should not return mobiledoc
            removeMobiledocFormat(frame);

            // CASE: Members needs to have the tags to check if its allowed access
            if (labs.isSet('members')) {
                includeTags(frame);
            }

            setDefaultOrder(frame);
        }

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key.type == 'content' ? content api access
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

            setDefaultOrder(frame);
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
            frame.data.posts[0].author_id = frame.data.posts[0].author;
            delete frame.data.posts[0].author;
        }

        frame.data.posts[0] = url.forPost(Object.assign({}, frame.data.posts[0]), frame.options);
    },

    edit(apiConfig, frame) {
        this.add(apiConfig, frame);
    }
};
