const _ = require('lodash');
const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:input:posts');
const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const url = require('./utils/url');
const slugFilterOrder = require('./utils/slug-filter-order');
const localUtils = require('../../index');
const mobiledoc = require('../../../../../lib/mobiledoc');
const postsMetaSchema = require('../../../../../data/schema').tables.posts_meta;
const postsSchema = require('../../../../../data/schema').tables.posts;
const clean = require('./utils/clean');
const lexical = require('../../../../../lib/lexical');
const sentry = require('../../../../../../shared/sentry');

const messages = {
    failedHtmlToMobiledoc: 'Failed to convert HTML to Mobiledoc',
    failedHtmlToLexical: 'Failed to convert HTML to Lexical'
};

/**
 * Selects all allowed columns for the given frame.
 *
 * NOTE: This doesn't stop them from being FETCHED, just returned in the response. This causes
 *   the output serializer to remove them from the data object before returning.
 *
 * NOTE: This is only intended for the Content API. We need these fields within Admin API responses.
 *
 * @param {Object} frame - The frame object.
 */
function removeSourceFormats(frame) {
    if (frame.options.formats?.includes('mobiledoc') || frame.options.formats?.includes('lexical')) {
        frame.options.formats = frame.options.formats.filter((format) => {
            return !['mobiledoc', 'lexical'].includes(format);
        });
    }
}

/**
 * Selects all allowed columns for the given frame.
 *
 * This removes the lexical and mobiledoc columns from the query. This is a performance improvement as we never intend
 *  to expose those columns in the content API and they are very large datasets to be passing around and de/serializing.
 *
 * NOTE: This is only intended for the Content API. We need these fields within Admin API responses.
 *
 * @param {Object} frame - The frame object.
 */
function selectAllAllowedColumns(frame) {
    if (!frame.options.columns && !frame.options.selectRaw) {
        // Because we're returning columns directly from the schema we need to remove info columns like @@UNIQUE_CONSTRAINTS@@ and @@INDEXES@@
        frame.options.selectRaw = _.keys(_.omit(postsSchema, ['lexical','mobiledoc','@@INDEXES@@','@@UNIQUE_CONSTRAINTS@@'])).join(',');
    } else if (frame.options.columns) {
        frame.options.columns = frame.options.columns.filter((column) => {
            return !['mobiledoc', 'lexical'].includes(column);
        });
    } else if (frame.options.selectRaw) {
        frame.options.selectRaw = frame.options.selectRaw.split(',').map((column) => {
            return column.trim();
        }).filter((column) => {
            return !['mobiledoc', 'lexical'].includes(column);
        }).join(',');
    }
}

/**
 * Map names of relations to the internal names
 */
function mapWithRelated(frame) {
    if (frame.options.withRelated) {
        // Map sentiment to count.sentiment
        frame.options.withRelated = frame.options.withRelated.map((relation) => {
            return relation === 'sentiment' ? 'count.sentiment' : relation;
        });
        return;
    }
}

function defaultRelations(frame) {
    // Apply same mapping as content API
    mapWithRelated(frame);

    // Additional defaults for admin API
    if (frame.options.withRelated) {
        return;
    }

    if (frame.options.columns && !frame.options.withRelated) {
        return false;
    }

    frame.options.withRelated = ['tags', 'authors', 'authors.roles', 'email', 'tiers', 'newsletter', 'count.clicks'];
}

function setDefaultOrder(frame) {
    if (!frame.options.order && frame.options.filter) {
        frame.options.autoOrder = slugFilterOrder('posts', frame.options.filter);
    }

    if (!frame.options.order && !frame.options.autoOrder) {
        // use id as fallback to ensure consistent ordering across pages when posts
        // have the same published_at timestamp
        frame.options.order = 'published_at desc, id desc';
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

    frame.options.formats = 'mobiledoc,lexical';
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
        frame.options.filter = 'status:[draft,published,scheduled,sent]';
    } else if (!frame.options.filter.match(/status:/)) {
        frame.options.filter = `(${frame.options.filter})+status:[draft,published,scheduled,sent]`;
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
            // CASE: the content api endpoint for posts should not return mobiledoc or lexical
            removeSourceFormats(frame); // remove from the format field
            selectAllAllowedColumns(frame); // remove from any specified column or selectRaw options

            setDefaultOrder(frame);
            forceVisibilityColumn(frame);
            mapWithRelated(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            forceStatusFilter(frame);
            defaultFormat(frame);
            defaultRelations(frame);
        }
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
            // CASE: the content api endpoint for posts should not return mobiledoc or lexical
            removeSourceFormats(frame);

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
                if (process.env.CI) {
                    console.time('htmlToMobiledocConverter (post)'); // eslint-disable-line no-console
                }

                try {
                    frame.data.posts[0].mobiledoc = JSON.stringify(mobiledoc.htmlToMobiledocConverter(html));
                } catch (err) {
                    sentry.captureException(err);
                    throw new ValidationError({
                        message: tpl(messages.failedHtmlToMobiledoc),
                        err
                    });
                }

                if (process.env.CI) {
                    console.timeEnd('htmlToMobiledocConverter (post)'); // eslint-disable-line no-console
                }

                // normally we don't allow both mobiledoc+lexical but the model layer will remove lexical
                // if mobiledoc is already present to avoid migrating formats outside of an explicit conversion
                if (process.env.CI) {
                    console.time('htmlToLexicalConverter (post)'); // eslint-disable-line no-console
                }

                try {
                    frame.data.posts[0].lexical = JSON.stringify(lexical.htmlToLexicalConverter(html));
                } catch (err) {
                    sentry.captureException(err);
                    throw new ValidationError({
                        message: tpl(messages.failedHtmlToLexical),
                        err
                    });
                }

                if (process.env.CI) {
                    console.timeEnd('htmlToLexicalConverter (post)'); // eslint-disable-line no-console
                }
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
                } else {
                    frame.data.posts[0].tags[index] = clean.postsTag(tag);
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
    },

    copy(apiConfig, frame) {
        debug('copy');

        defaultFormat(frame);
        defaultRelations(frame);
    }
};
