/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/date.js @ 407e032dc7 — transforms: imports→seam
// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

import {SafeString} from '../seam/handlebars-env.ts';
import moment from 'moment-timezone';
import _ from 'lodash';

export default function date(this: any, ...attrs: any[]) {
    // Options is the last argument
    const options = attrs.pop();
    let dateValue;

    // If there is any more arguments, date is the first one
    if (!_.isEmpty(attrs)) {
        dateValue = attrs.shift();

    // If there is no date argument & the current context contains published_at use that by default,
    // else date being undefined means moment will use the current date
    } else if (this.published_at) {
        dateValue = this.published_at;
    }

    // ensure that date is undefined, not null, as that can cause errors
    dateValue = dateValue === null ? undefined : dateValue;

    const {
        format = 'll',
        timeago,
        timezone = options.data.site.timezone,
        locale = options.data.site.locale
    } = options.hash;

    const timeNow = moment().tz(timezone);
    // Our date might be user input
    const testDateInput = Date.parse(dateValue);
    let dateMoment;
    if (isNaN(testDateInput) === false) {
        dateMoment = moment.parseZone(dateValue);
    } else {
        dateMoment = timeNow;
    }

    // i18n: Making dates, including month names, translatable to any language.
    // Documentation: http://momentjs.com/docs/#/i18n/
    // Locales: https://github.com/moment/moment/tree/develop/locale
    if (locale && locale.match('^[^/\\\\]*$') !== null) {
        // Moment ships region-specific locales (e.g. zh-cn, zh-tw, pa-in) for some
        // languages where Ghost's i18n uses a bare or script-tagged code (zh, zh-Hant, pa).
        // Maximize the locale to find the most likely regional variant, and let moment
        // pick the first candidate it has a locale for.
        const candidates = [locale];
        try {
            const maximized = new Intl.Locale(locale).maximize();
            if (maximized.region) {
                candidates.push(`${maximized.language}-${maximized.region}`, maximized.language);
            }
        } catch (e) {
            // Invalid locale tag - moment will fall back to the default locale
        }
        dateMoment.locale(candidates);
    }

    if (timeago) {
        dateValue = dateMoment.tz(timezone).from(timeNow);
    } else {
        dateValue = dateMoment.tz(timezone).format(format);
    }

    return new SafeString(dateValue);
}
