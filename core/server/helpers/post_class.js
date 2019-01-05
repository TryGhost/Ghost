// # Post Class Helper
// Usage: `{{post_class}}`
//
// Output classes for the body element
const _ = require('lodash');
const proxy = require('./proxy');
const SafeString = proxy.SafeString;

// We use the name post_class to match the helper for consistency:
module.exports = function post_class(options) { // eslint-disable-line camelcase
    let classes = ['post'];
    const context = options.data.root.context;
    const tags = this.post && this.post.tags ? this.post.tags : this.tags || [];
    const featured = this.post && this.post.featured ? this.post.featured : this.featured || false;

    if (tags) {
        classes = classes.concat(tags.map(function (tag) {
            return 'tag-' + tag.slug;
        }));
    }

    if (featured) {
        classes.push('featured');
    }

    if (context.includes('page')) {
        classes.push('page');
    }

    classes = _.reduce(classes, function (memo, item) {
        return memo + ' ' + item;
    }, '');
    return new SafeString(classes.trim());
};
