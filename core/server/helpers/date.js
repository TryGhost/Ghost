// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

var proxy = require('./proxy'),
    moment = require('moment-timezone'),
    SafeString = proxy.SafeString,
    i18n = proxy.i18n;

module.exports = function (date, options) {
    var timezone, format, timeago, timeNow, dateMoment;

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
    timezone = options.data.blog.timezone;
    timeNow = moment().tz(timezone);

    // i18n: Making dates, including month names, translatable to any language.
    // Documentation: http://momentjs.com/docs/#/i18n/
    // Locales: https://github.com/moment/moment/tree/develop/locale
    dateMoment = moment(date);
    dateMoment.locale(i18n.locale());

    if (timeago) {
        date = timezone ? dateMoment.tz(timezone).from(timeNow) : dateMoment.fromNow();
    } else {
        date = timezone ? dateMoment.tz(timezone).format(format) : dateMoment.format(format);
    }

    return new SafeString(date);
};
