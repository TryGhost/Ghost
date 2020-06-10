const _ = require('lodash');
const mapNQLKeyValues = require('@nexes/nql').utils.mapKeyValues;
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:posts');
const url = require('./utils/url');
const localUtils = require('../../index');
const mobiledoc = require('../../../../../lib/mobiledoc');
const postsMetaSchema = require('../../../../../data/schema').tables.posts_meta;

const replacePageWithType = mapNQLKeyValues({
    key: {
        from: 'page',
        to: 'type'
    },
    values: [{
        from: false,
        to: 'post'
    }, {
        from: true,
        to: 'page'
    }]
});

function removeMobiledocFormat(frame) {
    if (frame.options.formats && frame.options.formats.includes('mobiledoc')) {
        frame.options.formats = frame.options.formats.filter((format) => {
            return (format !== 'mobiledoc');
        });
    }
}

function defaultRelations(frame) {
    if (frame.options.withRelated) {
        return;
    }

    if (frame.options.columns && !frame.options.withRelated) {
        return false;
    }

    frame.options.withRelated = ['tags', 'authors', 'authors.roles'];
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

function forceVisibilityColumn(frame) {
    if (frame.options.columns && !frame.options.columns.includes('visibility')) {
        frame.options.columns.push('visibility');
    }
}

function defaultFormat(frame) {
    if (frame.options.formats) {
        return;
    }

    frame.options.formats = 'mobiledoc';
}

function handlePostsMeta(frame) {
    let metaAttrs = _.keys(_.omit(postsMetaSchema, ['id', 'post_id']));
    let meta = _.pick(frame.data.posts[0], metaAttrs);
    frame.data.posts[0].posts_meta = meta;
}

/**
 * CASE:
 *
 * - posts endpoint only returns posts, not pages
 * - we have to enforce the filter
 *
 * @TODO: https://github.com/TryGhost/Ghost/issues/10268
 */
const forcePageFilter = (frame) => {
    if (frame.options.filter) {
        frame.options.filter = `(${frame.options.filter})+type:post`;
    } else {
        frame.options.filter = 'type:post';
    }
};

const forceStatusFilter = (frame) => {
    if (!frame.options.filter) {
        frame.options.filter = 'status:[draft,published,scheduled]';
    } else if (!frame.options.filter.match(/status:/)) {
        frame.options.filter = `(${frame.options.filter})+status:[draft,published,scheduled]`;
    }
};

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        forcePageFilter(frame);

        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key.type == 'content' ? content api access
         * - user exists? admin api access
         */
        if (localUtils.isContentAPI(frame)) {
            // CASE: the content api endpoint for posts should not return mobiledoc
            removeMobiledocFormat(frame);

            setDefaultOrder(frame);
            forceVisibilityColumn(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            forceStatusFilter(frame);
            defaultFormat(frame);
            defaultRelations(frame);
        }

        frame.options.mongoTransformer = replacePageWithType;
    },

    read(apiConfig, frame) {
        debug('read');

        forcePageFilter(frame);

        /**
         * ## current cases:
         * - context object is empty (functional call, content api access)
         * - api_key.type == 'content' ? content api access
         * - user exists? admin api access
         */
        if (localUtils.isContentAPI(frame)) {
            // CASE: the content api endpoint for posts should not return mobiledoc
            removeMobiledocFormat(frame);

            setDefaultOrder(frame);
            forceVisibilityColumn(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            forceStatusFilter(frame);
            defaultFormat(frame);
            defaultRelations(frame);
        }
    },

    add(apiConfig, frame, options = {add: true}) {
        debug('add');

        if (_.get(frame,'options.source')) {
            const html = frame.data.posts[0].html;

            if (frame.options.source === 'html' && !_.isEmpty(html)) {
                frame.data.posts[0].mobiledoc = JSON.stringify(mobiledoc.htmlToMobiledocConverter(html));
            }
        }

        frame.data.posts[0] = url.forPost(Object.assign({}, frame.data.posts[0]), frame.options);

        // @NOTE: force adding post
        if (options.add) {
            frame.data.posts[0].type = 'post';
        }

        // CASE: Transform short to long format
        if (frame.data.posts[0].authors) {
            frame.data.posts[0].authors.forEach((author, index) => {
                if (_.isString(author)) {
                    frame.data.posts[0].authors[index] = {
                        email: author
                    };
                }
            });
        }

        if (frame.data.posts[0].tags) {
            frame.data.posts[0].tags.forEach((tag, index) => {
                if (_.isString(tag)) {
                    frame.data.posts[0].tags[index] = {
                        name: tag
                    };
                }
            });
        }

        handlePostsMeta(frame);
        defaultFormat(frame);
        defaultRelations(frame);
    },

    edit(apiConfig, frame) {
        debug('edit');
        this.add(apiConfig, frame, {add: false});

        handlePostsMeta(frame);
        forceStatusFilter(frame);
        forcePageFilter(frame);
    },

    destroy(apiConfig, frame) {
        debug('destroy');
        frame.options.destroyBy = {
            id: frame.options.id,
            type: 'post'
        };

        defaultFormat(frame);
        defaultRelations(frame);
    }
};
