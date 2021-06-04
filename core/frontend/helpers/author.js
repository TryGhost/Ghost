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
const {urlService, SafeString, escapeExpression, hbs, templates} = require('../services/proxy');
const buildInHelpers = hbs.handlebars.helpers;
const isString = require('lodash/isString');

/**
 * @deprecated: single authors was superceded by multiple authors in Ghost 1.22.0
 */
module.exports = function author(options) {
    if (options.fn) {
        return buildInHelpers.with.call(this, this.author, options);
    }

    const autolink = isString(options.hash.autolink) && options.hash.autolink === 'false' ? false : true;
    let output = '';

    if (this.author && this.author.name) {
        if (autolink) {
            output = templates.link({
                url: urlService.getUrlByResourceId(this.author.id, {withSubdirectory: true}),
                text: escapeExpression(this.author.name)
            });
        } else {
            output = escapeExpression(this.author.name);
        }
    }

    return new SafeString(output);
};
