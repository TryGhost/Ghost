// # Body Class Helper
// Usage: `{{body_class}}`
//
// Output classes for the body element
//
// We use the name body_class to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    api             = require('../api'),
    config          = require('../config'),
    filters         = require('../filters'),
    template        = require('./template'),
    body_class;

body_class = function () {
    var classes = [],
        post = this.post,
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (this.tag !== undefined) {
        classes.push('tag-template');
        classes.push('tag-' + this.tag.slug);
    }

    if (this.author !== undefined) {
        classes.push('author-template');
        classes.push('author-' + this.author.slug);
    }

    if (_.isString(this.relativeUrl) && this.relativeUrl.match(/\/(page\/\d)/)) {
        classes.push('paged');
    } else if (!this.relativeUrl || this.relativeUrl === '/' || this.relativeUrl === '') {
        classes.push('home-template');
    } else if (post && !page) {
        classes.push('post-template');
    }

    if (page) {
        classes.push('page-template');
    }

    if (tags) {
        classes = classes.concat(tags.map(function (tag) { return 'tag-' + tag.slug; }));
    }

    return api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function (response) {
        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value],
            view;

        if (post && page) {
            view = template.getThemeViewForPost(paths, post).split('-');

            if (view[0] === 'page' && view.length > 1) {
                classes.push(view.join('-'));
            }
        }

        return filters.doFilter('body_class', classes).then(function (classes) {
            var classString = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
            return new hbs.handlebars.SafeString(classString.trim());
        });
    });
};

module.exports = body_class;
