// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

var config          = require('../config'),
    schema          = require('../data/schema').checks,
    url;

url = function (options) {
    var absolute = options && options.hash.absolute;

    if (schema.isPost(this)) {
        return config.urlFor('post', {post: this}, absolute);
    }

    if (schema.isTag(this)) {
        return config.urlFor('tag', {tag: this}, absolute);
    }

    if (schema.isUser(this)) {
        return config.urlFor('author', {author: this}, absolute);
    }

    return config.urlFor(this, absolute);
};

module.exports = url;
