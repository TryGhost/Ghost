const _ = require('lodash');
const Promise = require('bluebird');
const ObjectId = require('bson-objectid');
const logging = require('../../../../../shared/logging');
const models = require('../../../../models');

module.exports.config = {
    transaction: true
};

module.exports.up = function handleMultipleAuthors(options) {
    const postAllColumns = ['id', 'author_id'];
    const userColumns = ['id'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    return models.User.getOwnerUser(_.merge({columns: userColumns}, localOptions))
        .then(function (ownerUser) {
            return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
                .then(function (posts) {
                    logging.info('Adding `posts_authors` relations');

                    return Promise.map(posts.models, function (post) {
                        let invalidAuthorId = false;

                        // CASE: ensure `post.author_id` is a valid user id
                        return models.User.findOne({id: post.get('author_id')}, _.merge({columns: userColumns}, localOptions))
                            .then(function (user) {
                                if (!user) {
                                    invalidAuthorId = true;

                                    // NOTE: updating the `author_id`, will auto initialize `post.authors`.
                                    // This is an edge case and should not happen for many blogs. We skip the manual insert.
                                    return models.Post.edit({
                                        author_id: ownerUser.id
                                    }, _.merge({id: post.id}, localOptions));
                                }

                                return post;
                            })
                            .then(function (post) {
                                if (invalidAuthorId) {
                                    return;
                                }

                                return options.transacting('posts_authors').insert({
                                    id: ObjectId.generate(),
                                    post_id: post.id,
                                    author_id: post.get('author_id'),
                                    sort_order: 0
                                });
                            });
                    }, {concurrency: 100});
                });
        });
};

module.exports.down = function handleMultipleAuthors(options) {
    logging.info('Removing `posts_authors` relations');
    return options.connection('posts_authors').truncate();
};
