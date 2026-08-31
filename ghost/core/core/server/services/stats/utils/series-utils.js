const moment = require('moment-timezone');
const DatabaseInfo = require('@tryghost/database-info');

const SERIES_AGGREGATIONS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

/**
 * Pick a bucket size that keeps the number of points in a chart readable.
 * @param {{dateFrom: string|null, dateTo: string|null}} range
 * @returns {'day'|'week'|'month'}
 */
function resolveSeriesAggregation({ dateFrom, dateTo }) {
  if (!dateFrom || !dateTo) {
    return SERIES_AGGREGATIONS.MONTH;
  }

  const rangeDays = Math.ceil(moment(dateTo).diff(moment(dateFrom), 'days', true));
  if (rangeDays > 270) {
    return SERIES_AGGREGATIONS.MONTH;
  }
  if (rangeDays >= 91) {
    return SERIES_AGGREGATIONS.WEEK;
  }
  return SERIES_AGGREGATIONS.DAY;
}

/**
 * Single UTC offset used for every row in a request. Buckets are computed in
 * SQL, which has no IANA database, so the offset has to be a constant; both
 * the bucket expression and the series fill must use this same value or they
 * disagree about which calendar day a boundary row belongs to.
 * @param {string} timezone
 * @returns {number}
 */
function getFixedOffsetMinutes(timezone) {
  return moment.tz(timezone).utcOffset();
}

/**
 * Build the select and group fragments for a calendar bucket in the requested
 * IANA timezone (timestamps are stored in UTC).
 * @param {import('knex').Knex} knex
 * @param {string} column
 * @param {number} tzOffsetMins
 * @param {'day'|'week'|'month'} aggregation
 * @returns {{select: import('knex').Knex.Raw, group: import('knex').Knex.Raw}}
 */
function getSeriesBucket(knex, column, tzOffsetMins, aggregation) {
  if (DatabaseInfo.isSQLite(knex)) {
    const dateModifier = `${Math.sign(tzOffsetMins) === -1 ? '' : '+'}${tzOffsetMins} minutes`;
    let expression = 'DATE(??, ?)';
    const bindings = [column, dateModifier];

    if (aggregation === SERIES_AGGREGATIONS.WEEK) {
      expression = "DATE(??, ?, 'weekday 0', '-6 days')";
    } else if (aggregation === SERIES_AGGREGATIONS.MONTH) {
      expression = "STRFTIME('%Y-%m-01', ??, ?)";
    }

    return {
      select: knex.raw(`CAST(${expression} AS CHAR) AS date`, bindings),
      // Grouping on the select alias keeps the bucket expression to a single
      // evaluation per row, which matters on full-table scans.
      group: knex.raw('??', ['date']),
    };
  }

  const mins = Math.abs(tzOffsetMins) % 60;
  const hours = (Math.abs(tzOffsetMins) - mins) / 60;
  const utcOffset = `${Math.sign(tzOffsetMins) === -1 ? '-' : '+'}${hours}:${mins < 10 ? '0' : ''}${mins}`;
  const localDate = "DATE(CONVERT_TZ(??, '+00:00', ?))";
  let expression = localDate;
  let bindings = [column, utcOffset];

  if (aggregation === SERIES_AGGREGATIONS.WEEK) {
    expression = `DATE_SUB(${localDate}, INTERVAL WEEKDAY(${localDate}) DAY)`;
    bindings = [column, utcOffset, column, utcOffset];
  } else if (aggregation === SERIES_AGGREGATIONS.MONTH) {
    expression = "DATE_FORMAT(CONVERT_TZ(??, '+00:00', ?), '%Y-%m-01')";
  }

  return {
    select: knex.raw(`CAST(${expression} AS CHAR) AS date`, bindings),
    group: knex.raw('??', ['date']),
  };
}

/**
 * Normalise a bucket key returned by the driver, which is a string on SQLite
 * and can be a Date on MySQL.
 * @param {string|Date} value
 * @returns {string}
 */
function formatBucketDate(value) {
  if (!(value instanceof Date)) {
    return String(value);
  }
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Zero-fill the gaps so the chart draws a continuous series.
 *
 * The window is derived from the same fixed offset `getSeriesBucket` used, so a
 * boundary row can never bucket outside the window (which would drop it).
 * Anything unvisited is still merged back in as a safety net: a key mismatch
 * should be impossible, but losing rows silently is worse than an odd label.
 *
 * A range with no rows returns an empty series rather than a row of zeroes per
 * bucket, which is what callers key their empty state off.
 * @template {Object} T
 * @param {T[]} rows
 * @param {{dateFrom: string|null, dateTo: string|null}} range
 * @param {number} offsetMinutes
 * @param {'day'|'week'|'month'} aggregation
 * @param {(date: string) => T} makeEmptyRow
 * @returns {T[]}
 */
function fillSeries(rows, range, offsetMinutes, aggregation, makeEmptyRow) {
  if (rows.length === 0) {
    return [];
  }

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const unit = aggregation === SERIES_AGGREGATIONS.WEEK ? 'isoWeek' : aggregation;
  const incrementUnit = aggregation === SERIES_AGGREGATIONS.WEEK ? 'week' : aggregation;
  const sortedDates = [...byDate.keys()].sort();
  // Wall-clock time under the fixed offset, kept in UTC mode so no further
  // DST shifting can happen while walking the window.
  const toLocal = (utcDate) => moment.utc(utcDate).add(offsetMinutes, 'minutes');
  const rangeStart = range.dateFrom
    ? toLocal(range.dateFrom).startOf('day')
    : moment.utc(sortedDates[0]).startOf(unit);
  const rangeEnd = range.dateTo
    ? toLocal(range.dateTo).startOf('day')
    : moment.utc(sortedDates[sortedDates.length - 1]).startOf(unit);
  const cursor = rangeStart.clone().startOf(unit);
  const lastBucket = rangeEnd.clone().startOf(unit);
  const result = [];
  const filled = new Set();

  while (cursor.isSameOrBefore(lastBucket)) {
    const key = cursor.format('YYYY-MM-DD');
    filled.add(key);
    result.push(byDate.get(key) || makeEmptyRow(key));
    cursor.add(1, incrementUnit);
  }

  for (const [key, row] of byDate) {
    if (!filled.has(key)) {
      result.push(row);
    }
  }

  result.sort((a, b) => a.date.localeCompare(b.date));

  // A week or month bucket can open before the requested range; label the
  // first one with the range start so the axis doesn't appear to start early.
  const rangeStartKey = rangeStart.format('YYYY-MM-DD');
  if (result[0].date < rangeStartKey && !filled.has(rangeStartKey) && !byDate.has(rangeStartKey)) {
    result[0] = { ...result[0], date: rangeStartKey };
  }

  return result;
}

module.exports = {
  SERIES_AGGREGATIONS,
  resolveSeriesAggregation,
  getFixedOffsetMinutes,
  getSeriesBucket,
  formatBucketDate,
  fillSeries,
};
