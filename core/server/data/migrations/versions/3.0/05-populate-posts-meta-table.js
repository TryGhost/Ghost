const postsMetaSchema = require('../../../schema').tables.posts_meta;
const ObjectId = require('bson-objectid');
const _ = require('lodash');
const models = require('../../../../models');
const common = require('../../../../lib/common');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);
    const metaAttrs = _.keys(postsMetaSchema);

    return models.Posts
        .forge()
        .query((qb) => {
            // We only want to add entries in new table for posts which have any metadata
            qb.whereNotNull('meta_title');
            qb.orWhereNotNull('meta_description');
            qb.orWhereNotNull('twitter_title');
            qb.orWhereNotNull('twitter_description');
            qb.orWhereNotNull('twitter_image');
            qb.orWhereNotNull('og_description');
            qb.orWhereNotNull('og_title');
            qb.orWhereNotNull('og_image');
        })
        .fetch(localOptions)
        .then(({models: posts}) => {
            if (posts.length > 0) {
                common.logging.info(`Adding ${posts.length} entries to posts_meta`);
                let postsMetaEntries = _.map(posts, (post) => {
                    let postsMetaEntry = metaAttrs.reduce(function (obj, entry) {
                        return Object.assign(obj, {
                            [entry]: post.get(entry)
                        });
                    }, {});
                    postsMetaEntry.post_id = post.get('id');
                    postsMetaEntry.id = ObjectId.generate();
                    return postsMetaEntry;
                });

                // NOTE: iterative method is needed to prevent from `SQLITE_ERROR: too many variables` error
                return Promise.map(postsMetaEntries, (postsMeta) => {
                    return localOptions.transacting('posts_meta').insert(postsMeta);
                });
            } else {
                common.logging.info('Skipping populating posts_meta table: found 0 posts with metadata');
                return Promise.resolve();
            }
        });
};

module.exports.down = function (options) {
    let localOptions = _.merge({
        context: {internal: true},
        migrating: true
    }, options);
    const metaAttrs = _.keys(_.omit(postsMetaSchema, ['id', 'post_id']));

    return models.PostsMeta
        .findAll(localOptions)
        .then(({models: postsMeta}) => {
            if (postsMeta.length > 0) {
                common.logging.info(`Adding metadata for ${postsMeta.length} posts from posts_meta table`);
                return Promise.map(postsMeta, (postsMeta) => {
                    let data = metaAttrs.reduce(function (obj, entry) {
                        return Object.assign(obj, {
                            [entry]: postsMeta.get(entry)
                        });
                    }, {});
                    return localOptions.transacting('posts').where({id: postsMeta.get('post_id')}).update(data);
                });
            } else {
                common.logging.info('Skipping populating meta fields from posts_meta: found 0 entries');
                return Promise.resolve();
            }
        });
};
