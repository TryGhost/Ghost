// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

const {SafeString, i18n} = require('./proxy');
const moment = require('moment-timezone');

module.exports = function (date, options) {
    let timezone;

    if (!options && Object.prototype.hasOwnProperty.call(date, 'hash')) {
        options = date;
        date = undefined;
        timezone = options.data.site.timezone;

        // set to published_at by default, if it's available
        // otherwise, this will print the current date
        if (this.published_at) {
            date = moment(this.published_at).tz(timezone).format();
        }
    }

    const {
        format = 'MMM DD, YYYY',
        timeago
    } = options.hash;

    // ensure that context is undefined, not null, as that can cause errors
    date = date === null ? undefined : date;
    timezone = options.data.site.timezone;
    const timeNow = moment().tz(timezone);

    // i18n: Making dates, including month names, translatable to any language.
    // Documentation: http://momentjs.com/docs/#/i18n/
    // Locales: https://github.com/moment/moment/tree/develop/locale
    const dateMoment = moment(date);
    dateMoment.locale(i18n.locale());

    if (timeago) {
        date = timezone ? dateMoment.tz(timezone).from(timeNow) : dateMoment.fromNow();
    } else {
        date = timezone ? dateMoment.tz(timezone).format(format) : dateMoment.format(format);
    }

    return new SafeString(date);
};
