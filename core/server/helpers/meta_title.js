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
        blog,
        page,
        pageString = '';

    if (_.isString(this.relativeUrl)) {
        blog = config.theme;

        page = this.relativeUrl.match(/\/page\/(\d+)/);

        if (page) {
            pageString = ' - Page ' + page[1];
        }

        if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
            title = blog.title;
        } else if (this.author) {
            title = this.author.name + pageString + ' - ' + blog.title;
        } else if (this.tag) {
            title = this.tag.name + pageString + ' - ' + blog.title;
        } else if (this.post) {
            title = _.isEmpty(this.post.meta_title) ? this.post.title : this.post.meta_title;
        } else {
            title = blog.title + pageString;
        }
    }
    return filters.doFilter('meta_title', title).then(function (title) {
        title = title || '';
        return title.trim();
    });
};

module.exports = meta_title;
