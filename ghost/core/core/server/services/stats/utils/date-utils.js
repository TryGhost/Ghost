const moment = require('moment-timezone');

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
    const dateFrom = options.date_from ? moment.tz(options.date_from, timezone).startOf('day').utc().toISOString() : null;
    const dateTo = options.date_to ? moment.tz(options.date_to, timezone).endOf('day').utc().toISOString() : null;
    return {dateFrom, dateTo};
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

module.exports = {
    getDateBoundaries,
    applyDateFilter
};