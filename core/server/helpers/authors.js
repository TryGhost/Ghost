'use strict';
// # Authors Helper
// Usage: `{{authors}}`, `{{authors separator=' - '}}`
//
// Returns a string of the authors on the post.
// By default, authors are separated by commas.
//
// Note that the standard {{#each authors}} implementation is unaffected by this helper.
const proxy = require('./proxy'),
    _ = require('lodash'),
    urlService = require('../services/url'),
    SafeString = proxy.SafeString,
    templates = proxy.templates,
    models = proxy.models;

module.exports = function authors(options) {
    options = options || {};
    options.hash = options.hash || {};

    const autolink = !(_.isString(options.hash.autolink) && options.hash.autolink === 'false'),
        separator = _.isString(options.hash.separator) ? options.hash.separator : ', ',
        prefix = _.isString(options.hash.prefix) ? options.hash.prefix : '',
        suffix = _.isString(options.hash.suffix) ? options.hash.suffix : '',
        limit = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined,
        visibilityArr = models.Base.Model.parseVisibilityString(options.hash.visibility);

    let output = '',
        from = options.hash.from ? parseInt(options.hash.from, 10) : 1,
        to = options.hash.to ? parseInt(options.hash.to, 10) : undefined;

    function createAuthorsList(authors) {
        function processAuthor(author) {
            return autolink ? templates.link({
                url: urlService.getUrlByResourceId(author.id, {withSubdirectory: true}),
                text: _.escape(author.name)
            }) : _.escape(author.name);
        }

        return models.Base.Model.filterByVisibility(authors, visibilityArr, !!options.hash.visibility, processAuthor);
    }

    if (this.authors && this.authors.length) {
        output = createAuthorsList(this.authors);
        from -= 1; // From uses 1-indexed, but array uses 0-indexed.
        to = to || limit + from || output.length;
        output = output.slice(from, to).join(separator);
    }

    if (output) {
        output = prefix + output + suffix;
    }

    return new SafeString(output);
};
