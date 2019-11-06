// # Post Class Helper
// Usage: `{{post_class}}`
//
// Output classes for the body element
var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString;

// We use the name post_class to match the helper for consistency:
module.exports = function post_class() { // eslint-disable-line camelcase
    var classes = ['post'],
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        featured = this.post && this.post.featured ? this.post.featured : this.featured || false,
        image = this.post && this.post.feature_image ? this.post.feature_image : this.feature_image || false,
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (tags) {
        classes = classes.concat(tags.map(function (tag) {
            return 'tag-' + tag.slug;
        }));
    }

    if (featured) {
        classes.push('featured');
    }

    if (!image) {
        classes.push('no-image');
    }

    if (page) {
        classes.push('page');
    }

    classes = _.reduce(classes, function (memo, item) {
        return memo + ' ' + item;
    }, '');
    return new SafeString(classes.trim());
};
