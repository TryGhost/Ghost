// ## Template utils
const templates = {};
const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const hbs = require('../engine');

const messages = {
    templateNotFound: 'Template {name} not found.'
};

// Execute a template helper
// All template helpers are register as partial view.
templates.execute = function execute(name, context, data) {
    const partial = hbs.handlebars.partials[name];

    if (partial === undefined) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.templateNotFound, {name: name})
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
