'use strict';
// # Authors Helper
// Usage: `{{authors}}`, `{{authors separator=' - '}}`
//
// Returns a string of the authors on the post.
// By default, authors are separated by commas.
//
// Note that the standard {{#each authors}} implementation is unaffected by this helper.
const _ = require('lodash');
const {SafeString, templates, urlService} = require('../services/proxy');
const ghostHelperUtils = require('@tryghost/helpers').utils;

module.exports = function authors(options = {}) {
    options.hash = options.hash || {};

    let {
        autolink,
        separator = ', ',
        prefix = '',
        suffix = '',
        limit,
        visibility,
        from = 1,
        to
    } = options.hash;
    let output = '';

    autolink = !(_.isString(autolink) && autolink === 'false');
    limit = limit ? parseInt(limit, 10) : limit;
    from = from ? parseInt(from, 10) : from;
    to = to ? parseInt(to, 10) : to;

    function createAuthorsList(authorsList) {
        function processAuthor(author) {
            return autolink ? templates.link({
                url: urlService.getUrlByResourceId(author.id, {withSubdirectory: true}),
                text: _.escape(author.name)
            }) : _.escape(author.name);
        }

        return ghostHelperUtils.visibility.filter(authorsList, visibility, processAuthor);
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
