// # Post Class Helper
// Usage: `{{post_class}}`
//
// Output classes for the body element
const {SafeString} = require('../services/handlebars');

// We use the name post_class to match the helper for consistency:
module.exports = function post_class() { // eslint-disable-line camelcase
    let classes = ['post'];

    const tags = this.post && this.post.tags ? this.post.tags : this.tags || [];
    const featured = this.post && this.post.featured ? this.post.featured : this.featured || false;
    const image = this.post && this.post.feature_image ? this.post.feature_image : this.feature_image || false;
    const page = this.post && this.post.page ? this.post.page : this.page || false;

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

    classes = classes.reduce(function (memo, item) {
        return memo + ' ' + item;
    }, '');

    return new SafeString(classes.trim());
};
