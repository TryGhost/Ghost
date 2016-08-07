// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

var moment = require('moment-timezone'),
    date;

date = function (date, options) {
    if (!options && date.hasOwnProperty('hash')) {
        options = date;
        date = moment(this.published_at || new Date());
    } else {
        date = moment(date);
    }

    var timezone = options.data.blog.timezone;

    if (timezone) {
        date = date.tz(timezone);
    }

    if (options.hash.timeago) {
        return timezone ? date.from(moment.tz(timezone)) : date.fromNow();
    }

    return date.format(options.hash.format || 'MMM DD, YYYY');
};

module.exports = date;
