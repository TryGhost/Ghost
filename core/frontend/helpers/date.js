// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

const {SafeString} = require('../services/proxy');
const moment = require('moment-timezone');
const _ = require('lodash');

module.exports = function (...attrs) {
    // Options is the last argument
    const options = attrs.pop();
    let date;

    // If there is any more arguments, date is the first one
    if (!_.isEmpty(attrs)) {
        date = attrs.shift();

    // If there is no date argument & the current context contains published_at use that by default,
    // else date being undefined means moment will use the current date
    } else if (this.published_at) {
        date = this.published_at;
    }

    // ensure that date is undefined, not null, as that can cause errors
    date = date === null ? undefined : date;

    const timezone = options.data.site.timezone;
    const locale = options.data.site.locale;

    const {
        format = 'll',
        timeago
    } = options.hash;

    const timeNow = moment().tz(timezone);
    // Our date might be user input
    let testDateInput = Date.parse(date);
    let dateMoment;
    if (isNaN(testDateInput) === false) {
        dateMoment = moment.parseZone(date);
    } else {
        dateMoment = timeNow;
    }

    // i18n: Making dates, including month names, translatable to any language.
    // Documentation: http://momentjs.com/docs/#/i18n/
    // Locales: https://github.com/moment/moment/tree/develop/locale
    dateMoment.locale(locale);

    if (timeago) {
        date = dateMoment.tz(timezone).from(timeNow);
    } else {
        date = dateMoment.tz(timezone).format(format);
    }

    return new SafeString(date);
};
