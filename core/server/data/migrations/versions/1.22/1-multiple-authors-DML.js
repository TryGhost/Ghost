'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../../../lib/common'),
    models = require('../../../../models');

module.exports.config = {
    transaction: true
};

module.exports.up = function handleMultipleAuthors(options) {
    const postAllColumns = ['id', 'author_id'],
        userColumns = ['id'];

    let localOptions = _.merge({
        context: {internal: true}
    }, options);

    return models.User.getOwnerUser(_.merge({columns: userColumns}, localOptions))
        .then(function (ownerUser) {
            return models.Post.findAll(_.merge({columns: postAllColumns}, localOptions))
                .then(function (posts) {
                    common.logging.info('Adding `posts_authors` relations');

                    return Promise.map(posts.models, function (post) {
                        let authorIdToSet;

                        // CASE: ensure `post.author_id` is a valid user id
                        return models.User.findOne({id: post.get('author_id')}, _.merge({columns: userColumns}, localOptions))
                            .then(function (user) {
                                if (!user) {
                                    authorIdToSet = ownerUser.id;
                                } else {
                                    authorIdToSet = post.get('author_id');
                                }
                            })
                            .then(function () {
                                // CASE: insert primary author
                                return models.Post.edit({
                                    author_id: authorIdToSet,
                                    authors: [{
                                        id: post.get('author_id')
                                    }]
                                }, _.merge({id: post.id}, localOptions));
                            });
                    }, {concurrency: 100});
                });
        });
};

module.exports.down = function handleMultipleAuthors(options) {
    common.logging.info('Removing `posts_authors` relations');
    return options.connection('posts_authors').truncate();
};
