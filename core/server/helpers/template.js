var templates     = {},
    hbs           = require('express-hbs'),
    errors        = require('../errorHandling');

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

module.exports = templates;