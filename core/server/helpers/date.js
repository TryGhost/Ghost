// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment.js. Formats published_at by default but will also take a date as a parameter

var moment          = require('moment'),
    date;

date = function (date, options) {
    if (!options && date.hasOwnProperty('hash')) {
        options = date;
        date = undefined;

        // set to published_at by default, if it's available
        // otherwise, this will print the current date
        if (this.published_at) {
            date = this.published_at;
        }
    }

    // ensure that context is undefined, not null, as that can cause errors
    date = date === null ? undefined : date;

    var f = options.hash.format || 'MMM Do, YYYY',
        timeago = options.hash.timeago;

    if (timeago) {
        date = moment(date).fromNow();
    } else {
        date = moment(date).format(f);
    }
    return date;
};

module.exports = date;
