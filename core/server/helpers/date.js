// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment.js. Formats published_at by default but will also take a date as a parameter

var moment          = require('moment'),
    config          = require('../config'),
    date;

date = function (context, options) {
    if (!options && context.hasOwnProperty('hash')) {
        options = context;
        context = undefined;

        // set to published_at by default, if it's available
        // otherwise, this will print the current date
        if (this.published_at) {
            context = this.published_at;
        }
    }

    // ensure that context is undefined, not null, as that can cause errors
    context = context === null ? undefined : context;

    var f = options.hash.format || 'MMM Do, YYYY',
        locale = options.hash.locale || config.locale,
        timeago = options.hash.timeago,
        mdate = moment(context).lang(locale),
        date;

    if (timeago) {
        date = mdate.fromNow();
    } else {
        date = mdate.format(f);
    }
    return date;
};

module.exports = date;
