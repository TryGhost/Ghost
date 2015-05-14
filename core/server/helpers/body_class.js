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

body_class = function (options) {
    var classes = [],
        context = options.data.root.context,
        post = this.post,
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false;

    if (post) {
        // To be removed from pages by #2597 when we're ready to deprecate this
        // i.e. this should be if (_.contains(context, 'post') && post) { ... }
        classes.push('post-template');
    }

    if (_.contains(context, 'home')) {
        classes.push('home-template');
    } else if (_.contains(context, 'page') && page) {
        classes.push('page-template');
        // To be removed by #2597 when we're ready to deprecate this
        classes.push('page');
    } else if (_.contains(context, 'tag') && this.tag) {
        classes.push('tag-template');
        classes.push('tag-' + this.tag.slug);
    } else if (_.contains(context, 'author') && this.author) {
        classes.push('author-template');
        classes.push('author-' + this.author.slug);
    } else if (_.contains(context, 'private')) {
        classes.push('private-template');
    }

    if (tags) {
        classes = classes.concat(tags.map(function (tag) { return 'tag-' + tag.slug; }));
    }

    if (_.contains(context, 'paged')) {
        classes.push('paged');
        // To be removed from pages by #2597 when we're ready to deprecate this
        classes.push('archive-template');
    }

    return api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function (response) {
        var activeTheme = response.settings[0],
            paths = config.paths.availableThemes[activeTheme.value],
            view;

        if (post && page) {
            view = template.getThemeViewForPost(paths, post).split('-');

            if (view[0] === 'page' && view.length > 1) {
                classes.push(view.join('-'));
                // To be removed by #2597 when we're ready to deprecate this
                view.splice(1, 0, 'template');
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
