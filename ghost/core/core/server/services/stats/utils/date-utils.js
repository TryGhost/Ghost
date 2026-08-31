const moment = require('moment-timezone');
const { BadRequestError } = require('@tryghost/errors');

/**
 * Get processed date boundaries with timezone support
 * @param {Object} options - Options containing date and timezone info
 * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
 * @param {string} [options.date_to] - End date in YYYY-MM-DD format
 * @param {string} [options.timezone='UTC'] - Timezone for date interpretation
 * @returns {{dateFrom: string|null, dateTo: string|null}} Processed dates in ISO format
 */
function getDateBoundaries(options) {
  const timezone = options.timezone || 'UTC';
  const dateFrom = options.date_from
    ? moment.tz(options.date_from, timezone).startOf('day').utc().toISOString()
    : null;
  const dateTo = options.date_to
    ? moment.tz(options.date_to, timezone).endOf('day').utc().toISOString()
    : null;
  return { dateFrom, dateTo };
}

/**
 * Apply date filters to a query builder instance
 * @param {import('knex').Knex.QueryBuilder} query - The query builder to apply filters to
 * @param {string|null} dateFrom - Start date in ISO format
 * @param {string|null} dateTo - End date in ISO format
 * @param {string} dateColumn - The date column to filter on
 */
function applyDateFilter(query, dateFrom, dateTo, dateColumn) {
  if (dateFrom) {
    query.where(dateColumn, '>=', dateFrom);
  }
  if (dateTo) {
    query.where(dateColumn, '<=', dateTo);
  }
}

/**
 * Get boundaries for the length-matched window immediately preceding the
 * requested range, for period-over-period comparisons.
 *
 * Returns null when either bound is missing (e.g. unbounded "all time"
 * requests), since "previous" is undefined without a known length.
 *
 * @param {Object} options - Options containing date and timezone info
 * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
 * @param {string} [options.date_to] - End date in YYYY-MM-DD format
 * @param {string} [options.timezone='UTC'] - Timezone for date interpretation
 * @returns {{dateFrom: string|null, dateTo: string|null}|null} Processed dates in ISO format
 */
function getPreviousDateBoundaries(options) {
  const timezone = options.timezone || 'UTC';

  if (!options.date_from || !options.date_to) {
    return null;
  }

  const startOfFrom = moment.tz(options.date_from, timezone).startOf('day');
  const startOfTo = moment.tz(options.date_to, timezone).startOf('day');
  const lengthDays = startOfTo.diff(startOfFrom, 'days') + 1;

  if (lengthDays <= 0) {
    return null;
  }

  return getDateBoundaries({
    date_from: startOfFrom.clone().subtract(lengthDays, 'days').format('YYYY-MM-DD'),
    date_to: startOfFrom.clone().subtract(1, 'day').format('YYYY-MM-DD'),
    timezone,
  });
}

/**
 * Validate user-supplied date range options before they reach a query.
 * @param {Object} options - Options containing date and timezone info
 * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
 * @param {string} [options.date_to] - End date in YYYY-MM-DD format
 * @param {string} [options.timezone='UTC'] - Timezone for date interpretation
 * @throws {BadRequestError} When a bound is malformed, inverted, or the timezone is unknown
 */
function validateDateRangeOptions({ date_from: dateFrom, date_to: dateTo, timezone = 'UTC' }) {
  if (!moment.tz.zone(timezone)) {
    throw new BadRequestError({ message: 'Invalid timezone.' });
  }

  for (const [name, value] of [
    ['date_from', dateFrom],
    ['date_to', dateTo],
  ]) {
    if (value && !moment(value, 'YYYY-MM-DD', true).isValid()) {
      throw new BadRequestError({ message: `Invalid ${name}. Expected YYYY-MM-DD.` });
    }
  }

  if (dateFrom && dateTo && moment(dateFrom).isAfter(moment(dateTo))) {
    throw new BadRequestError({ message: 'date_from must be before or equal to date_to.' });
  }
}

module.exports = {
  getDateBoundaries,
  getPreviousDateBoundaries,
  applyDateFilter,
  validateDateRangeOptions,
};
