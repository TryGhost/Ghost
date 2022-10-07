// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper
const {urlService} = require('../services/proxy');
const {SafeString, escapeExpression, templates} = require('../services/handlebars');

const isString = require('lodash/isString');
const ghostHelperUtils = require('@tryghost/helpers').utils;

module.exports = function tags(options) {
    options = options || {};
    options.hash = options.hash || {};

    const autolink = !(isString(options.hash.autolink) && options.hash.autolink === 'false');
    const separator = isString(options.hash.separator) ? options.hash.separator : ', ';
    const prefix = isString(options.hash.prefix) ? options.hash.prefix : '';
    const suffix = isString(options.hash.suffix) ? options.hash.suffix : '';
    const limit = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined;
    let output = '';
    let from = options.hash.from ? parseInt(options.hash.from, 10) : 1;
    let to = options.hash.to ? parseInt(options.hash.to, 10) : undefined;

    function createTagList(tagsList) {
        function processTag(tag) {
            return autolink ? templates.link({
                url: urlService.getUrlByResourceId(tag.id, {withSubdirectory: true}),
                text: escapeExpression(tag.name)
            }) : escapeExpression(tag.name);
        }

        return ghostHelperUtils.visibility.filter(tagsList, options.hash.visibility, processTag);
    }

    if (this.tags && this.tags.length) {
        output = createTagList(this.tags);
        from -= 1; // From uses 1-indexed, but array uses 0-indexed.
        to = to || limit + from || output.length;
        output = output.slice(from, to).join(separator);
    }

    if (output) {
        output = prefix + output + suffix;
    }

    return new SafeString(output);
};
