// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`
//
// Formats a date using moment-timezone.js. Formats published_at by default but will also take a date as a parameter

const { SafeString } = require('../services/handlebars');
const moment = require('moment-timezone');
const _ = require('lodash');

// Locales are a small, fixed set per site - cache the maximized candidate
// list per locale string instead of recomputing it on every helper call.
const localeCandidatesCache = new Map();

function getLocaleCandidates(locale) {
  if (localeCandidatesCache.has(locale)) {
    return localeCandidatesCache.get(locale);
  }

  const candidates = [locale];
  try {
    const maximized = new Intl.Locale(locale).maximize();
    if (maximized.region) {
      candidates.push(`${maximized.language}-${maximized.region}`, maximized.language);
    }
  } catch (e) {
    // Invalid locale tag - moment will fall back to the default locale
  }

  localeCandidatesCache.set(locale, candidates);
  return candidates;
}

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

  const {
    format = 'll',
    timeago,
    timezone = options.data.site.timezone,
    locale = options.data.site.locale,
  } = options.hash;

  // timeNow is only needed as the `.from()` reference for timeago output -
  // only construct it when timeago is actually requested.
  let timeNow;
  if (timeago) {
    timeNow = moment().tz(timezone);
  }

  // Our date might be user input
  let testDateInput = Date.parse(date);
  let dateMoment;
  if (isNaN(testDateInput) === false) {
    dateMoment = moment.parseZone(date);
  } else {
    dateMoment = timeNow || moment().tz(timezone);
  }

  // i18n: Making dates, including month names, translatable to any language.
  // Documentation: http://momentjs.com/docs/#/i18n/
  // Locales: https://github.com/moment/moment/tree/develop/locale
  if (locale && locale.match('^[^/\\\\]*$') !== null) {
    // Moment ships region-specific locales (e.g. zh-cn, zh-tw, pa-in) for some
    // languages where Ghost's i18n uses a bare or script-tagged code (zh, zh-Hant, pa).
    // Maximize the locale to find the most likely regional variant, and let moment
    // pick the first candidate it has a locale for.
    dateMoment.locale(getLocaleCandidates(locale));
  }

  if (timeago) {
    date = dateMoment.tz(timezone).from(timeNow);
  } else {
    date = dateMoment.tz(timezone).format(format);
  }

  return new SafeString(date);
};
