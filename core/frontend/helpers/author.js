// # Author Helper
// Usage: `{{author}}` OR `{{#author}}{{/author}}`
//
// Can be used as either an output or a block helper
//
// Output helper: `{{author}}`
// Returns the full name of the author of a given post, or a blank string
// if the author could not be determined.
//
// Block helper: `{{#author}}{{/author}}`
// This is the default handlebars behaviour of dropping into the author object scope
const proxy = require('./proxy'),
    _ = require('lodash'),
    urlService = require('../services/url'),
    SafeString = proxy.SafeString,
    handlebars = proxy.hbs.handlebars,
    templates = proxy.templates;

/**
 * @deprecated: will be removed in Ghost 3.0
 */
module.exports = function author(options) {
    if (options.fn) {
        return handlebars.helpers.with.call(this, this.author, options);
    }

    const autolink = _.isString(options.hash.autolink) && options.hash.autolink === 'false' ? false : true;
    let output = '';

    if (this.author && this.author.name) {
        if (autolink) {
            output = templates.link({
                url: urlService.getUrlByResourceId(this.author.id, {withSubdirectory: true}),
                text: _.escape(this.author.name)
            });
        } else {
            output = _.escape(this.author.name);
        }
    }

    return new SafeString(output);
};
