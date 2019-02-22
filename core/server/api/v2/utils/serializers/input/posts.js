const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:posts');
const url = require('./utils/url');
const localUtils = require('../../index');
const labs = require('../../../../../services/labs');
const converters = require('../../../../../lib/mobiledoc/converters');

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
         * CASE:
         *
         * - posts endpoint only returns posts, not pages
         * - we have to enforce the filter
         *
         * @TODO: https://github.com/TryGhost/Ghost/issues/10268
         */
        if (frame.options.filter) {
            frame.options.filter = `(${frame.options.filter})+page:false`;
        } else {
            frame.options.filter = 'page:false';
        }

        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key.type == 'content' ? content api access
         * - user exists? admin api access
         */
        if (localUtils.isContentAPI(frame)) {
            // CASE: the content api endpoint for posts should not return mobiledoc
            removeMobiledocFormat(frame);

            // CASE: Members needs to have the tags to check if its allowed access
            if (labs.isSet('members')) {
                includeTags(frame);
            }

            setDefaultOrder(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            // @TODO: remove when we drop v0.1
            if (!frame.options.filter || !frame.options.filter.match(/status:/)) {
                frame.options.status = 'all';
            }
        }

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        frame.data.page = false;

        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key.type == 'content' ? content api access
         * - user exists? admin api access
         */
        if (localUtils.isContentAPI(frame)) {
            // CASE: the content api endpoint for posts should not return mobiledoc
            removeMobiledocFormat(frame);

            if (labs.isSet('members')) {
                // CASE: Members needs to have the tags to check if its allowed access
                includeTags(frame);
            }

            setDefaultOrder(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            // @TODO: remove when we drop v0.1
            if (!frame.options.filter || !frame.options.filter.match(/status:/)) {
                frame.data.status = 'all';
            }
        }

        debug(frame.options);
    },

    add(apiConfig, frame) {
        debug('add');

        if (_.get(frame,'options.source')) {
            const html = frame.data.posts[0].html;

            if (frame.options.source === 'html' && !_.isEmpty(html)) {
                frame.data.posts[0].mobiledoc = JSON.stringify(converters.htmlToMobiledocConverter(html));
            }
        }

        frame.data.posts[0] = url.forPost(Object.assign({}, frame.data.posts[0]), frame.options);

        // @NOTE: force storing post
        frame.data.posts[0].page = false;
    },

    edit(apiConfig, frame) {
        this.add(apiConfig, frame);

        // @NOTE: force that you cannot update pages via posts endpoint
        frame.options.page = false;
    },

    destroy(apiConfig, frame) {
        frame.options.destroyBy = {
            id: frame.options.id,
            page: false
        };
    }
};
