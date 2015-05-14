// # Meta Title Helper
// Usage: `{{meta_title}}`
//
// Page title used for sharing and SEO
//
// We use the name meta_title to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var _           = require('lodash'),
    config      = require('../config'),
    filters     = require('../filters'),
    meta_title;

meta_title = function (options) {
    /*jshint unused:false*/
    var title = '',
        context = options.data.root.context,
        blog = config.theme,
        pagination = options.data.root.pagination,
        pageString = '';

    if (pagination && pagination.total > 1) {
        pageString = ' - Page ' + pagination.page;
    }

    if (this.meta_title) {
        title = this.meta_title;  // E.g. in {{#foreach}}
    } else if (_.contains(context, 'home')) {
        title = blog.title;
    } else if (_.contains(context, 'author') && this.author) {
        title = this.author.name + pageString + ' - ' + blog.title;
    } else if (_.contains(context, 'tag') && this.tag) {
        title = this.tag.meta_title || this.tag.name + pageString + ' - ' + blog.title;
    } else if ((_.contains(context, 'post') || _.contains(context, 'page')) && this.post) {
        title = this.post.meta_title || this.post.title;
    } else {
        title = blog.title + pageString;
    }

    return filters.doFilter('meta_title', title).then(function (title) {
        title = title || '';
        return title.trim();
    });
};

module.exports = meta_title;
