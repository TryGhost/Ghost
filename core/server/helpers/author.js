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

const {SafeString, templates, url, hbs: {handlebars}} = require('./proxy'),
    isString = require('lodash/isString'),
    ESCAPE = require('lodash/escape'); // must be capital to avoid naming collision

/**
 * @deprecated: will be removed in Ghost 2.0
 */

module.exports = function author(options) {
    const {fn, hash: {autolink}} = options;
    if (fn) {
        return handlebars.helpers.with.call(this, this.author, options);
    }

    const autolinkCheck = isString(autolink) && autolink === 'false' ? false : true;
    let output = '';

    if (this.author && author.name) {
        if (autolinkCheck) {
            output = templates.link({
                url: url.urlFor('author', {author}),
                text: ESCAPE(this.author.name)
            });
        } else {
            output = ESCAPE(this.author.name);
        }
    }

    return new SafeString(output);
};
