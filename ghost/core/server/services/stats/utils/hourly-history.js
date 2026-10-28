const moment = require('moment-timezone');

/**
 * Builds the hour-by-hour running totals for a single day. Totals are rebuilt
 * from where the day ended by undoing the day's changes, then replaying them
 * hour by hour. Each point is labelled with the
 * start of its hour in the given timezone and holds the totals at the end of
 * that hour, so it lines up with hourly visitor counts.
 *
 * @template T
 * @param {object} options
 * @param {string} options.date - The day, YYYY-MM-DD in `timezone`
 * @param {string} [options.timezone] - IANA timezone, defaults to UTC
 * @param {T} options.current - The totals at the end of the day (now, for today)
 * @param {Array<{created_at: Date|string}>} options.events - The day's changes
 * @param {(totals: T, event: any, direction: 1|-1) => T} options.apply - Applies (1) or undoes (-1) one change
 * @returns {{hours: Array<{date: string, totals: T, events: any[]}>, start: T}}
 */
function buildHourlyTotals({ date, timezone = 'UTC', current, events, apply }) {
  const tz = moment.tz.zone(timezone) ? timezone : 'UTC';
  const dayStart = moment.tz(date, 'YYYY-MM-DD', tz).startOf('day');
  const dayEnd = moment.min(dayStart.clone().add(1, 'day'), moment().tz(tz));

  const sorted = events
    .map((event) => ({ event, at: eventTime(event.created_at) }))
    .sort((a, b) => a.at.valueOf() - b.at.valueOf());

  // Undo the day's changes to get where the day began
  let totals = current;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    totals = apply(totals, sorted[i].event, -1);
  }
  const start = totals;

  const hours = [];
  let next = 0;
  for (let hour = dayStart.clone(); hour.isBefore(dayEnd); hour = hour.clone().add(1, 'hour')) {
    const hourEnd = hour.clone().add(1, 'hour');
    const inHour = [];
    while (next < sorted.length && sorted[next].at.isBefore(hourEnd)) {
      totals = apply(totals, sorted[next].event, 1);
      inHour.push(sorted[next].event);
      next += 1;
    }
    hours.push({ date: hour.format('YYYY-MM-DDTHH:mm'), totals, events: inHour });
  }

  return { hours, start };
}

/**
 * When an event happened. MySQL returns dates; SQLite returns UTC timestamps
 * as zone-less text, which would otherwise be read in the process's timezone
 * @param {Date|string} createdAt
 */
function eventTime(createdAt) {
  return typeof createdAt === 'string'
    ? moment.utc(createdAt, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601])
    : moment(createdAt);
}

/**
 * Whether a day has ended, so changes can have been made since. Today hasn't,
 * and there's nothing to look up after it
 * @param {string} date - YYYY-MM-DD
 * @param {string} [timezone]
 */
function hasDayEnded(date, timezone = 'UTC') {
  return moment.utc(dayEndUtc(date, timezone), 'YYYY-MM-DD HH:mm:ss').isSameOrBefore(moment());
}

/**
 * The UTC timestamp a day ends at (the next day's start), for querying the
 * changes made since, which the current totals already include
 * @param {string} date - YYYY-MM-DD
 * @param {string} [timezone]
 */
function dayEndUtc(date, timezone = 'UTC') {
  const tz = moment.tz.zone(timezone) ? timezone : 'UTC';
  return moment
    .tz(date, 'YYYY-MM-DD', tz)
    .startOf('day')
    .add(1, 'day')
    .utc()
    .format('YYYY-MM-DD HH:mm:ss');
}

/**
 * The UTC timestamp a single day starts at, for querying the changes since then
 * @param {string} date - YYYY-MM-DD
 * @param {string} [timezone]
 */
function dayStartUtc(date, timezone = 'UTC') {
  const tz = moment.tz.zone(timezone) ? timezone : 'UTC';
  return moment.tz(date, 'YYYY-MM-DD', tz).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
}

// Offsets in force before this are history (local mean time in the 1800s and
// the like), older than any Ghost site's data
const OFFSETS_SINCE = Date.UTC(2010, 0, 1);

/**
 * Whether a timezone's local days start part-way through a UTC hour, as in
 * India (+5:30) or Nepal (+5:45)
 * @param {string} timezone
 */
function hasPartHourOffset(timezone) {
  const zone = moment.tz.zone(timezone);
  if (!zone) {
    return false;
  }
  return zone.offsets.some((offset, i) => zone.untils[i] > OFFSETS_SINCE && offset % 60 !== 0);
}

/**
 * A SQL expression for the UTC time bucket a timestamp falls in, as text
 * ('YYYY-MM-DD HH:mm:00'). Changes are added up per bucket in the database,
 * then into the viewer's local days in code, because MySQL's own timezone
 * conversion needs tables most servers lack. Buckets are UTC hours, or quarter
 * hours for timezones whose days start part-way through an hour.
 * @param {import('knex').Knex} knex
 * @param {string} column
 * @param {string} timezone
 */
function utcBucketExpression(knex, column, timezone) {
  const sqlite = String(knex.client.config.client).includes('sqlite');
  if (!hasPartHourOffset(timezone)) {
    return sqlite
      ? `strftime('%Y-%m-%d %H:00:00', ${column})`
      : `DATE_FORMAT(${column}, '%Y-%m-%d %H:00:00')`;
  }
  return sqlite
    ? `(strftime('%Y-%m-%d %H:', ${column}) || printf('%02d', (CAST(strftime('%M', ${column}) AS INTEGER) / 15) * 15) || ':00')`
    : `CONCAT(DATE_FORMAT(${column}, '%Y-%m-%d %H:'), LPAD(FLOOR(MINUTE(${column}) / 15) * 15, 2, '0'), ':00')`;
}

/**
 * Adds up per-UTC-bucket rows into days in a timezone
 * @param {Array<Object>} rows - Rows with an `hour` (the UTC bucket, 'YYYY-MM-DD HH:mm:ss') and numeric fields
 * @param {string} timezone
 * @param {string[]} fields - The fields to add up
 * @param {string[]} [keys] - Fields that split a day into separate rows, e.g. currency
 * @returns {Array<Object>} One row per local day (and key), with `date` as YYYY-MM-DD, ascending
 */
function sumByLocalDay(rows, timezone, fields, keys = []) {
  const tz = moment.tz.zone(timezone) ? timezone : 'UTC';
  const days = new Map();
  for (const row of rows) {
    const date = moment.utc(String(row.hour), 'YYYY-MM-DD HH:mm:ss').tz(tz).format('YYYY-MM-DD');
    const id = [date, ...keys.map((key) => row[key])].join('|');
    if (!days.has(id)) {
      const day = { date };
      for (const key of keys) {
        day[key] = row[key];
      }
      for (const field of fields) {
        day[field] = 0;
      }
      days.set(id, day);
    }
    const day = days.get(id);
    for (const field of fields) {
      day[field] += Number(row[field]) || 0;
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Today's date in a timezone (UTC when unknown), YYYY-MM-DD
 * @param {string} [timezone]
 */
function todayIn(timezone) {
  const tz = timezone && moment.tz.zone(timezone) ? timezone : 'UTC';
  return moment().tz(tz).format('YYYY-MM-DD');
}

/** Whether a timezone was asked for and is one we know */
function isKnownTimezone(timezone) {
  return Boolean(timezone && moment.tz.zone(timezone));
}

module.exports = {
  buildHourlyTotals,
  dayStartUtc,
  dayEndUtc,
  hasDayEnded,
  utcBucketExpression,
  sumByLocalDay,
  todayIn,
  isKnownTimezone,
};
