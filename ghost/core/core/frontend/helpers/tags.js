// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper
const {urlService} = require('../services/proxy');
const {SafeString, escapeExpression, templates} = require('../services/handlebars');
const {isString, template} = require('lodash');
const ghostHelperUtils = require('@tryghost/helpers').utils;

const tagLink = templates.link;
const tagLinkWithClass = template('<a class="<%= tag_class %>" href="<%= url %>"><%= text %></a>');
const tagSpan = template('<span class="<%= tag_class %>"><%= text %></span>');

const CSS_CLASSES = {
    tag: 'post-tag',
    prefix: 'post-tag-prefix',
    separator: 'post-tag-separator',
    suffix: 'post-tag-suffix'
};

module.exports = function tags(options) {
    options = options || {};
    options.hash = options.hash || {};

    const autolink = !(isString(options.hash.autolink) && options.hash.autolink === 'false');
    const html = (isString(options.hash.wrapHtml) && options.hash.wrapHtml === 'true');
    const limit = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined;

    let output = '';
    let from = options.hash.from ? parseInt(options.hash.from, 10) : 1;
    let to = options.hash.to ? parseInt(options.hash.to, 10) : undefined;
    let prefix = isString(options.hash.prefix) ? options.hash.prefix : '';
    let suffix = isString(options.hash.suffix) ? options.hash.suffix : '';

    let separator = isString(options.hash.separator) ? options.hash.separator : ', ';
    if (html) {
        separator = tagSpan({
            tag_class: CSS_CLASSES.separator,
            text: separator
        });
    }

    function createTagList(tagsList) {
        let tagTemplate = tagLink;
        let processTag = function (tag) {
            return tagTemplate({
                url: urlService.getUrlByResourceId(tag.id, {withSubdirectory: true}),
                text: escapeExpression(tag.name),
                tag_class: CSS_CLASSES.tag
            });
        };

        if (html) {
            tagTemplate = autolink ? tagLinkWithClass : tagSpan;
        } else if (!autolink) {
            processTag = function (tag) {
                return escapeExpression(tag.name);
            };
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
        if (html) {
            if (prefix) {
                prefix = tagSpan({
                    text: prefix,
                    tag_class: CSS_CLASSES.prefix
                });
            }

            if (suffix) {
                suffix = tagSpan({
                    text: suffix,
                    tag_class: CSS_CLASSES.suffix
                });
            }
        }

        output = prefix + output + suffix;
    }

    return new SafeString(output);
};
