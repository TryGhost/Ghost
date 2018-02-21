'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    models = require('../../../../models');

module.exports.config = {
    transaction: true
};

module.exports.up = function handleMultipleAuthors(options) {
    const postAllColumns = ['id', 'author_id', 'slug', 'title'],
        userColumns = ['id'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    return models.User.getOwnerUser(_.merge({columns: userColumns}, localOptions))
        .then(function (ownerUser) {
            return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
                .then(function (posts) {
                    common.logging.info('Adding `posts_authors` relations');

                    // CASE: ensure `post.author_id` is a valid user id
                    return Promise.map(posts.models, function (post) {
                        return models.User.findOne({id: post.get('author_id')}, _.merge({columns: userColumns}, localOptions))
                            .then(function (user) {
                                if (!user) {
                                    post.set('author_id', ownerUser.id);
                                }
                            })
                            .then(function () {
                                // CASE: insert primary author
                                post.set('authors', [
                                    {
                                        id: post.get('author_id')
                                    }
                                ]);

                                return post.save(null, localOptions);
                            });
                    }, {concurrency: 100});
                });
        });
};

module.exports.down = function handleMultipleAuthors(options) {
    common.logging.info('Removing `posts_authors` relations');
    return options.connection('posts_authors').truncate();
};
