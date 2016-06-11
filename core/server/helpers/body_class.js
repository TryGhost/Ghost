// # Body Class Helper
// Usage: `{{body_class}}`
//
// Output classes for the body element
//
// We use the name body_class to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    // @TODO Fix this
    template        = require('../controllers/frontend/templates'),
    body_class;

body_class = function (options) {
    var classes = [],
        context = options.data.root.context,
        post = this.post,
        tags = this.post && this.post.tags ? this.post.tags : this.tags || [],
        page = this.post && this.post.page ? this.post.page : this.page || false,
        activeTheme = options.data.root.settings.activeTheme,
        view;

    if (post) {
        // To be removed from pages by #2597 when we're ready to deprecate this
        // i.e. this should be if (_.includes(context, 'post') && post) { ... }
        classes.push('post-template');
    }

    if (_.includes(context, 'home')) {
        classes.push('home-template');
    } else if (_.includes(context, 'page') && page) {
        classes.push('page-template');
        // To be removed by #2597 when we're ready to deprecate this
        classes.push('page');
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
        // To be removed from pages by #2597 when we're ready to deprecate this
        classes.push('archive-template');
    }

    if (post && page) {
        view = template.single(activeTheme, post).split('-');

        if (view[0] === 'page' && view.length > 1) {
            classes.push(view.join('-'));
            // To be removed by #2597 when we're ready to deprecate this
            view.splice(1, 0, 'template');
            classes.push(view.join('-'));
        }
    }

    classes = _.reduce(classes, function (memo, item) { return memo + ' ' + item; }, '');
    return new hbs.handlebars.SafeString(classes.trim());
};

module.exports = body_class;
