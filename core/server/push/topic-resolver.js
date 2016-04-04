var config = require('../config'),
    resolveTopicsForPost;

resolveTopicsForPost = function (post) {
    var topics = [];

    topics.push(config.urlFor('rss', true));

    return post.author().fetch()
        .then(function (author) {
            author = { slug: author.get('slug') };

            topics.push(config.urlFor('author', { author: author }, true) + 'rss/');

            return post.tags().fetch();
        })
        .then(function (tags) {
            tags.forEach(function(tag) {
                tag = { slug: tag.get('slug') };

                topics.push(config.urlFor('tag', { tag: tag }, true) + 'rss/');
            });

            return topics;
        });
};

module.exports = resolveTopicsForPost;
