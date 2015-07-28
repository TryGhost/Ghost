// # Excerpt Helper
// Usage: `{{excerpt}}`, `{{excerpt words="50"}}`, `{{excerpt characters="256"}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"

var hbs             = require('express-hbs'),
    _               = require('lodash'),
    downsize        = require('downsize'),
    excerpt;

excerpt = function (options) {
    var truncateOptions = (options || {}).hash || {},
        excerpt;

    truncateOptions = _.pick(truncateOptions, ['words', 'characters', 'round', 'append']);
    ['words', 'characters'].map(function (key) {
        if (!truncateOptions[key]) { return; }
        truncateOptions[key] = parseInt(truncateOptions[key], 10);
    });
    truncateOptions.round = !!truncateOptions.round;

    if (!truncateOptions.words && !truncateOptions.characters) {
        truncateOptions.words = 50;
    }

    /*jslint regexp:true */
    excerpt = String(this.html);
    // Strip inline and bottom footnotes
    excerpt = excerpt.replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '');
    excerpt = excerpt.replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '');

    // Strip other html
    if (!truncateOptions.round) {
        excerpt = excerpt.replace(/<\/?[^>]+>/gi, '');
        excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
        excerpt = downsize(excerpt, truncateOptions);
    } else {
        excerpt = downsize(excerpt, truncateOptions);
        // Strip other html
        excerpt = excerpt.replace(/<\/?[^>]+>/gi, '');
        excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
    }
    /*jslint regexp:false */

    return new hbs.handlebars.SafeString(excerpt);
};

module.exports = excerpt;
