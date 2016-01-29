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

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    config          = require('../config'),
    utils           = require('./utils'),
    author;

author = function (context, options) {
    if (_.isUndefined(options)) {
        options = context;
    }

    if (options.fn) {
        return hbs.handlebars.helpers.with.call(this, this.author, options);
    }

    var autolink = _.isString(options.hash.autolink) && options.hash.autolink === 'false' ? false : true,
        output = '';

    if (this.author && this.author.name) {
        if (autolink) {
            output = utils.linkTemplate({
                url: config.urlFor('author', {author: this.author}),
                text: _.escape(this.author.name)
            });
        } else {
            output = _.escape(this.author.name);
        }
    }

    return new hbs.handlebars.SafeString(output);
};

module.exports = author;
