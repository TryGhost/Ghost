var templates = {},
    _ = require('lodash'),
    proxy = require('./proxy'),
    hbs = require('../services/themes/engine');

// ## Template utils

// Execute a template helper
// All template helpers are register as partial view.
templates.execute = function execute(name, context, data) {
    var partial = hbs.handlebars.partials[name];

    if (partial === undefined) {
        throw new proxy.errors.IncorrectUsageError({
            message: proxy.i18n.t('warnings.helpers.template.templateNotFound', {name: name})
        });
    }

    // If the partial view is not compiled, it compiles and saves in handlebars
    if (typeof partial === 'string') {
        hbs.registerPartial(partial);
    }

    return new hbs.SafeString(partial(context, data));
};

templates.asset = _.template('<%= source %>?v=<%= version %>');
templates.link = _.template('<a href="<%= url %>"><%= text %></a>');
templates.script = _.template('<script src="<%= source %>?v=<%= version %>"></script>');
templates.input = _.template('<input class="<%= className %>" type="<%= type %>" name="<%= name %>" <%= extras %> />');

module.exports = templates;
