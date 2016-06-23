// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

var moment          = require('moment-timezone'),
    date,
    timezone;

date = function (date, options) {
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

    var convertToStr = function(context) {
        var diff = moment(context).diff(moment(), "days");
        if (diff < -6) {
            return moment(context).format("YYYY年MM月DD日");
        } else if (diff < -2) {
            return moment(context).format("dddd");
        } else if (diff < -1) {
            return "一昨日";
        } else if (diff < 0) {
            return "昨日";
        } else if (diff < 1) {
            return moment(context).fromNow();
        } else if (diff < 2) {
            return "明日";
        } else if (diff < 3) {
            return "明後日";
        } else {
            return moment(context).format("YYYY年MM月DD日");
        }
    };

    var f = options.hash.format || 'MMM DD, YYYY',
        timeago = options.hash.timeago,
        timeNow = moment().tz(timezone),
        lang = options.hash.lang || "en";

    moment.locale(lang);

    if (timeago) {
        date = timezone ?  moment(date).tz(timezone).from(timeNow) : moment(date).fromNow();
    } else {
        date = timezone ? moment(date).tz(timezone).format(f) : moment(date).format(f);
    }

    return date;
};

module.exports = date;
