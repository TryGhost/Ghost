/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/theme-engine/handlebars/template.js @ 407e032dc7
// — transforms: CJS → ESM, `require('../engine')` → seam handlebars-env `hbs` shim.
// ## Template utils
const templates: any = {};
import _ from 'lodash';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import {hbs} from './handlebars-env.ts';

const messages = {
    templateNotFound: 'Template {name} not found.'
};

// Execute a template helper
// All template helpers are register as partial view.
templates.execute = function execute(name: string, context?: any, data?: any) {
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

export default templates;
