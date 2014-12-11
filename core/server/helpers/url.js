// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

var Promise         = require('bluebird'),
    config          = require('../config'),
    schema          = require('../data/schema').checks,
    url;

url = function (options) {
    var absolute = options && options.hash.absolute;

    if (schema.isPost(this)) {
        return Promise.resolve(config.urlFor('post', {post: this}, absolute));
    }

    if (schema.isTag(this)) {
        return Promise.resolve(config.urlFor('tag', {tag: this}, absolute));
    }

    if (schema.isUser(this)) {
        return Promise.resolve(config.urlFor('author', {author: this}, absolute));
    }

    return Promise.resolve(config.urlFor(this, absolute));
};

module.exports = url;
