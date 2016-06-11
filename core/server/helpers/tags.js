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

    var autolink   = !(_.isString(options.hash.autolink) && options.hash.autolink === 'false'),
        separator  = _.isString(options.hash.separator) ? options.hash.separator : ', ',
        prefix     = _.isString(options.hash.prefix) ? options.hash.prefix : '',
        suffix     = _.isString(options.hash.suffix) ? options.hash.suffix : '',
        limit      = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined,
        from       = options.hash.from ? parseInt(options.hash.from, 10) : 1,
        to         = options.hash.to ? parseInt(options.hash.to, 10) : undefined,
        visibility = utils.parseVisibility(options),
        output     = '';

    function createTagList(tags) {
        return _.reduce(tags, function (tagArray, tag) {
            // If labs.internalTags is set && visibility is not set to all
            // Then, if tag has a visibility property, and that visibility property is also not explicitly allowed, skip tag
            // or if there is no visibility property, and options.hash.visibility was set, skip tag
            if (labs.isSet('internalTags') && !_.includes(visibility, 'all')) {
                if (
                    (tag.visibility && !_.includes(visibility, tag.visibility) && !_.includes(visibility, 'all')) ||
                    (!!options.hash.visibility && !_.includes(visibility, 'all') && !tag.visibility)
                ) {
                    // Skip this tag
                    return tagArray;
                }
            }

            var tagOutput = autolink ? utils.linkTemplate({
                url: config.urlFor('tag', {tag: tag}),
                text: _.escape(tag.name)
            }) : _.escape(tag.name);

            tagArray.push(tagOutput);

            return tagArray;
        }, []);
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

    return new hbs.handlebars.SafeString(output);
};

module.exports = tags;
