// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

const {SafeString, themeI18n} = require('../services/proxy');
const moment = require('moment-timezone');

module.exports = function (date, options) {
    // ensure that context is undefined, not null, as that can cause errors
    date = date === null ? undefined : date;

    if (!options) {
        options = date;
        date = undefined;
    }

    // If the current context contains published_at use that by default,
    /// else date being undefined means moment will use the current date
    if (!date && this.published_at) {
        date = this.published_at;
    }

    const timezone = options.data.site.timezone;
    const {
        format = 'll',
        timeago
    } = options.hash;

    // i18n: Making dates, including month names, translatable to any language.
    // Documentation: http://momentjs.com/docs/#/i18n/
    // Locales: https://github.com/moment/moment/tree/develop/locale
    const dateMoment = moment(date);
    dateMoment.locale(themeI18n.locale());
    const timeNow = moment().tz(timezone);

    if (timeago) {
        date = dateMoment.tz(timezone).from(timeNow);
    } else {
        date = dateMoment.tz(timezone).format(format);
    }

    return new SafeString(date);
};
