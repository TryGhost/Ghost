// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper
const {urlService} = require('../services/proxy');
const {SafeString, escapeExpression} = require('../services/handlebars');
const _ = require('lodash');
const isString = _.isString;
const ghostHelperUtils = require('@tryghost/helpers').utils;

const tagLink = _.template('<a class="<%= tag_class %>" href="<%= url %>"><%= text %></a>');
const tagSpan = _.template('<span class="<%= tag_class %>"><%= text %></span>');

const tagClass = 'post-tag';
const prefixClass = 'post-tag-prefix';
const sepratorClass = 'post-tag-separator';
const suffixClass = 'post-tag-suffix';

module.exports = function tags(options) {
    options = options || {};
    options.hash = options.hash || {};

    const autolink = !(isString(options.hash.autolink) && options.hash.autolink === 'false');
    const separator = isString(options.hash.separator) ? options.hash.separator : ', ';
    const limit = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined;

    let output = '';
    let from = options.hash.from ? parseInt(options.hash.from, 10) : 1;
    let to = options.hash.to ? parseInt(options.hash.to, 10) : undefined;
    let prefix = isString(options.hash.prefix) ? options.hash.prefix : '';
    let suffix = isString(options.hash.suffix) ? options.hash.suffix : '';

    function createTagList(tagsList) {
        function processTag(tag) {
            return autolink ? tagLink({
                url: urlService.getUrlByResourceId(tag.id, {withSubdirectory: true}),
                text: escapeExpression(tag.name),
                tag_class: tagClass
            }) : tagSpan({
                text: escapeExpression(tag.name),
                tag_class: tagClass
            });
        }

        return ghostHelperUtils.visibility.filter(tagsList, options.hash.visibility, processTag);
    }

    if (this.tags && this.tags.length) {
        output = createTagList(this.tags);
        from -= 1; // From uses 1-indexed, but array uses 0-indexed.
        to = to || limit + from || output.length;
        output = output.slice(from, to).join(tagSpan({
            tag_class: sepratorClass,
            text: separator
        }));
    }

    if (output) {
        if (prefix) {
            prefix = tagSpan({
                text: prefix,
                tag_class: prefixClass
            });
        }

        if (suffix) {
            suffix = tagSpan({
                text: suffix,
                tag_class: suffixClass
            });
        }

        output = prefix + output + suffix;
    }

    return new SafeString(output);
};
