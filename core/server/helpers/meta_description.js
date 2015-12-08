// # Meta Description Helper
// Usage: `{{meta_description}}`
//
// Page description used for sharing and SEO
//
// We use the name meta_description to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var _           = require('lodash'),
    config      = require('../config'),
    meta_description;

meta_description = function (options) {
    options = options || {};

    var context = options.data.root.context,
        description;

    if (this.meta_description) {
        description = this.meta_description;  // E.g. in {{#foreach}}
    } else if (_.contains(context, 'paged')) {
        description = '';
    } else if (_.contains(context, 'home')) {
        description = config.theme.description;
    } else if (_.contains(context, 'author') && this.author) {
        description = this.author.bio;
    } else if (_.contains(context, 'tag') && this.tag) {
        description = this.tag.meta_description;
    } else if ((_.contains(context, 'post') || _.contains(context, 'page')) && this.post) {
        description = this.post.meta_description;
    }

    return (description || '').trim();
};

module.exports = meta_description;
