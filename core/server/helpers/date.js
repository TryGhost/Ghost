// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

var proxy = require('./proxy'),
    moment = require('moment-timezone'),
    SafeString = proxy.SafeString;

module.exports = function (date, options) {
    var timezone, format, timeago, timeNow;

    if (!options && date.hasOwnProperty('hash')) {
        options = date;
        date = undefined;
        timezone = options.data.blog.timezone;

        // set to published_at by default, if it's available
        // otherwise, this will print the current date
        if (this.published_at) {
            date = moment(this.published_at).tz(timezone).format();
        }
    }

    // ensure that context is undefined, not null, as that can cause errors
    date = date === null ? undefined : date;

    format = options.hash.format || 'MMM DD, YYYY';
    timeago = options.hash.timeago;
    timeNow = moment().tz(timezone);

    if (timeago) {
        date = timezone ? moment(date).tz(timezone).from(timeNow) : moment(date).fromNow();
    } else {
        date = timezone ? moment(date).tz(timezone).format(format) : moment(date).format(format);
    }

    return new SafeString(date);
};
