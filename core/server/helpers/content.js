// # Content Helper
// Usage: `{{content}}`, `{{content words="20"}}`, `{{content characters="256"}}`, `{{content characters="256" round="true"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Enables tag-safe truncation of content by characters or words.

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    downsize        = require('downsize'),
    downzero        = require('../utils/downzero'),
    content;

content = function (options) {
    var inputOptions = (options || {}).hash || {},
        intOptions,
        boolOptions;

    intOptions = _.pick(inputOptions, ['words', 'characters']);
    _.keys(intOptions).map(function (key) {
        intOptions[key] = parseInt(intOptions[key], 10);
    });

    boolOptions = _.pick(inputOptions, ['round']);
    _.keys(boolOptions).map(function (key) {
        boolOptions[key] = _.isString(boolOptions[key]) && boolOptions[key].toLowerCase() === 'true' ? true : false;
    });

    if (intOptions.hasOwnProperty('words') || intOptions.hasOwnProperty('characters')) {
        // Legacy function: {{content words="0"}} should return leading tags.
        if (intOptions.hasOwnProperty('words') && intOptions.words === 0) {
            return new hbs.handlebars.SafeString(
                downzero(this.html)
            );
        }

        return new hbs.handlebars.SafeString(
            downsize(this.html, _.extend(intOptions, boolOptions))
        );
    }

    return new hbs.handlebars.SafeString(this.html);
};

module.exports = content;
