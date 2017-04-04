// # Post Class Helper
// Usage: `{{post_class}}`
//
// Output classes for the body element
//
// We use the name body_class to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString;

module.exports = function post_class() {
    var classes = ['post'],
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        featured = this.post && this.post.featured ? this.post.featured : this.featured || false,
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (tags) {
        classes = classes.concat(tags.map(function (tag) {
            return 'tag-' + tag.slug;
        }));
    }

    if (featured) {
        classes.push('featured');
    }

    if (page) {
        classes.push('page');
    }

    classes = _.reduce(classes, function (memo, item) {
        return memo + ' ' + item;
    }, '');
    return new SafeString(classes.trim());
};
