// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper
const proxy = require('./proxy');
const _ = require('lodash');
const ghostHelperUtils = require('@tryghost/helpers').utils;

const urlService = proxy.urlService;
const SafeString = proxy.SafeString;
const templates = proxy.templates;

module.exports = function tags(options) {
    options = options || {};
    options.hash = options.hash || {};

    const autolink = !(_.isString(options.hash.autolink) && options.hash.autolink === 'false'),
        separator = _.isString(options.hash.separator) ? options.hash.separator : ', ',
        prefix = _.isString(options.hash.prefix) ? options.hash.prefix : '',
        suffix = _.isString(options.hash.suffix) ? options.hash.suffix : '',
        limit = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined;

    let output = '',
        from = options.hash.from ? parseInt(options.hash.from, 10) : 1,
        to = options.hash.to ? parseInt(options.hash.to, 10) : undefined;

    function createTagList(tags) {
        function processTag(tag) {
            return autolink ? templates.link({
                url: urlService.getUrlByResourceId(tag.id, {withSubdirectory: true}),
                text: _.escape(tag.name)
            }) : _.escape(tag.name);
        }

        return ghostHelperUtils.visibility.filter(tags, options.hash.visibility, processTag);
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
