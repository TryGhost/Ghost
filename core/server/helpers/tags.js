// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    config          = require('../config'),
    labs            = require('../utils/labs'),
    utils           = require('./utils'),
    tags;

tags = function (options) {
    options = options || {};
    options.hash = options.hash || {};

    var autolink = options.hash && _.isString(options.hash.autolink) && options.hash.autolink === 'false' ? false : true,
        separator = options.hash && _.isString(options.hash.separator) ? options.hash.separator : ', ',
        prefix = options.hash && _.isString(options.hash.prefix) ? options.hash.prefix : '',
        suffix = options.hash && _.isString(options.hash.suffix) ? options.hash.suffix : '',
        output;

    function createTagList(tags) {
        return _.reduce(tags, function (tagArray, tag) {
            // If labs.hiddenTags is set, and the tag is hidden, ignore it
            if (labs.isSet('hiddenTags') && tag.hidden) {
                return tagArray;
            }

            var tagOutput = autolink ? utils.linkTemplate({
                url: config.urlFor('tag', {tag: tag}),
                text: _.escape(tag.name)
            }) : _.escape(tag.name);
            tagArray.push(tagOutput);

            return tagArray;
        }, []).join(separator);
    }

    output = createTagList(this.tags);

    if (output) {
        output = prefix + output + suffix;
    }

    return new hbs.handlebars.SafeString(output);
};

module.exports = tags;
