// # Body Class Helper
// Usage: `{{body_class}}`
//
// Output classes for the body element
var proxy = require('./proxy'),
    _ = require('lodash'),
    SafeString = proxy.SafeString;

// We use the name body_class to match the helper for consistency:
module.exports = function body_class(options) { // eslint-disable-line camelcase
    var classes = [],
        context = options.data.root.context,
        post = this.post,
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (_.includes(context, 'home')) {
        classes.push('home-template');
    } else if (_.includes(context, 'post') && post) {
        classes.push('post-template');
    } else if (_.includes(context, 'page') && page) {
        classes.push('page-template');
        classes.push('page-' + this.post.slug);
    } else if (_.includes(context, 'tag') && this.tag) {
        classes.push('tag-template');
        classes.push('tag-' + this.tag.slug);
    } else if (_.includes(context, 'author') && this.author) {
        classes.push('author-template');
        classes.push('author-' + this.author.slug);
    } else if (_.includes(context, 'private')) {
        classes.push('private-template');
    }

    if (tags) {
        classes = classes.concat(tags.map(function (tag) { return 'tag-' + tag.slug; }));
    }

    if (_.includes(context, 'paged')) {
        classes.push('paged');
    }

    classes = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
    return new SafeString(classes.trim());
};

