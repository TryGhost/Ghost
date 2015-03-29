// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

var urls            = require('../utils/url'),
    schema          = require('../data/schema').checks,
    url;

url = function (options) {
    var absolute = options && options.hash.absolute;

    if (schema.isPost(this)) {
        return urls.urlFor('post', {post: this}, absolute);
    }

    if (schema.isTag(this)) {
        return urls.urlFor('tag', {tag: this}, absolute);
    }

    if (schema.isUser(this)) {
        return urls.urlFor('author', {author: this}, absolute);
    }

    if (schema.isNav(this)) {
        return urls.urlFor('nav', {nav: this}, absolute);
    }

    return urls.urlFor(this, absolute);
};

module.exports = url;
