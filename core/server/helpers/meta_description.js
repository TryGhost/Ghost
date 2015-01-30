// # Meta Description Helper
// Usage: `{{meta_description}}`
//
// Page description used for sharing and SEO
//
// We use the name meta_description to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var _           = require('lodash'),
    config      = require('../config'),
    filters     = require('../filters'),
    meta_description;

meta_description = function () {
    var description,
        blog,
        pagePattern = new RegExp('\\/page\\/');

    if (_.isString(this.relativeUrl)) {
        blog = config.theme;
        if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
            description = blog.description;
        } else if (this.author) {
            description = pagePattern.test(this.relativeUrl) ? '' : this.author.bio;
        } else if (this.tag) {
            if (pagePattern.test(this.relativeUrl)) {
                description = '';
            } else {
                description = _.isEmpty(this.tag.meta_description) ? '' : this.tag.meta_description;
            }
        } else if (this.post) {
            description = _.isEmpty(this.post.meta_description) ? '' : this.post.meta_description;
        }
    }

    return filters.doFilter('meta_description', description).then(function (description) {
        description = description || '';
        return description.trim();
    });
};

module.exports = meta_description;
