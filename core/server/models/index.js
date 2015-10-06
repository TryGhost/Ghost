/**
 * Dependencies
 */

var Promise = require('bluebird'),
    _ = require('lodash'),

    exports,
    models;

/**
 * Expose all models
 */

exports = module.exports;

models = [
    'accesstoken',
    'app-field',
    'app-setting',
    'app',
    'client-trusted-domain',
    'client',
    'permission',
    'post',
    'refreshtoken',
    'role',
    'settings',
    'tag',
    'user'
];

function init() {
    exports.Base = require('./base');

    models.forEach(function (name) {
        _.extend(exports, require('./' + name));
    });

    return Promise.resolve();
}

/**
 * TODO: move to some other place
 */

// ### deleteAllContent
// Delete all content from the database (posts, tags, tags_posts)
exports.deleteAllContent = function deleteAllContent() {
    var self = this;

    return self.Post.findAll().then(function then(posts) {
        return Promise.all(_.map(posts.toJSON(), function mapper(post) {
            return self.Post.destroy({id: post.id});
        }));
    }).then(function () {
        return self.Tag.findAll().then(function then(tags) {
            return Promise.all(_.map(tags.toJSON(), function mapper(tag) {
                return self.Tag.destroy({id: tag.id});
            }));
        });
    });
};

/**
 * Expose `init`
 */

exports.init = init;
