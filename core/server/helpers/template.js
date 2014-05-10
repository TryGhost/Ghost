var templates     = {},
    hbs           = require('express-hbs'),
    errors        = require('../errors');

// ## Template utils

// Execute a template helper
// All template helpers are register as partial view.
templates.execute = function (name, context) {

    var partial = hbs.handlebars.partials[name];

    if (partial === undefined) {
        errors.logAndThrowError('Template ' + name + ' not found.');
        return;
    }

    // If the partial view is not compiled, it compiles and saves in handlebars
    if (typeof partial === 'string') {
        hbs.registerPartial(partial);
    }

    return new hbs.handlebars.SafeString(partial(context));
};

// Given a theme object and a post object this will return
// which theme template page should be used.
// If given a post object that is a regular post
// it will return 'post'.
// If given a static post object it will return 'page'.
// If given a static post object and a custom page template
// exits it will return that page.
templates.getThemeViewForPost = function (themePaths, post) {
    var customPageView = 'page-' + post.slug,
        view = 'post';

    if (post.page) {
        if (themePaths.hasOwnProperty(customPageView + '.hbs')) {
            view = customPageView;
        } else if (themePaths.hasOwnProperty('page.hbs')) {
            view = 'page';
        }
    }

    return view;
};

module.exports = templates;