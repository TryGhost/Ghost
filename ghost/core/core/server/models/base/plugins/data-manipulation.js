const moment = require('moment');
const { DateTime } = require('luxon');

const schema = require('../../../data/schema');

/**
 * @param {number} ms - epoch milliseconds
 * @returns {number} ms rounded down to the whole second
 */
function truncateToSeconds(ms) {
  return Math.floor(ms / 1000) * 1000;
}

/**
 * Handles the Dates MySQL hands back (and numbers) without building a moment,
 * since this runs for every date column of every row. Everything else,
 * including SQLite's UTC strings, goes through moment exactly as before.
 *
 * @param {Date|number|string|import('luxon').DateTime|import('moment').Moment} value
 * @returns {number} epoch milliseconds, or NaN when the value is not a valid date
 */
function toEpochMilliseconds(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    // NaN for numbers outside the range a Date can hold, like moment
    return new Date(value).getTime();
  }

  // moment would read a Luxon DateTime as today's date at midnight
  if (DateTime.isDateTime(value)) {
    return value.toMillis();
  }

  return moment(value).valueOf();
}

/**
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
  Bookshelf.Model = Bookshelf.Model.extend({
    getNullableStringProperties() {
      const table = schema.tables[this.tableName];
      return Object.keys(table).filter((column) => table[column].nullable);
    },

    setEmptyValuesToNull: function setEmptyValuesToNull() {
      const nullableStringProps = this.getNullableStringProperties();
      return nullableStringProps.forEach((prop) => {
        if (this.get(prop) === '') {
          this.set(prop, null);
        }
      });
    },

    /**
     * before we insert dates into the database, we have to normalize
     * date format is now in each db the same
     *
     * Bookshelf runs `format` (and so this) for where-clauses and relation
     * setup as well as for writes.
     *
     * @param {object} attrs - attributes to convert
     * @returns {object} attrs - converted attributes
     */
    fixDatesWhenSave: function fixDatesWhenSave(attrs) {
      const tableDef = schema.tables[this.tableName];

      for (const key in attrs) {
        if (attrs[key] && tableDef?.[key]?.type === 'dateTime') {
          const ms = toEpochMilliseconds(attrs[key]);
          // 'Invalid date' is what moment's format() produced for invalid
          // input. toISOString is UTC; it writes years outside 0-9999 as
          // ±YYYYYY, but MySQL can only store 1000-9999 anyway.
          attrs[key] = Number.isNaN(ms)
            ? 'Invalid date'
            : new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
        }
      }

      return attrs;
    },

    /**
     * all supported databases (sqlite, mysql) return different values
     *
     * sqlite:
     *   - knex returns a UTC String (2018-04-12 20:50:35), or epoch
     *     milliseconds for rows written with a raw Date binding
     * mysql:
     *   - knex wraps the UTC value into a local JS Date
     *
     * Runs for every date column of every fetched row, so it avoids building
     * a date-library object for the Date and number values mysql hands back.
     *
     * @param {object} attrs - attributes to convert
     * @returns {object} attrs - converted attributes
     */
    fixDatesWhenFetch: function fixDatesWhenFetch(attrs) {
      const tableDef = schema.tables[this.tableName];

      for (const key in attrs) {
        if (attrs[key] && tableDef?.[key]?.type === 'dateTime') {
          const ms = toEpochMilliseconds(attrs[key]);

          // CASE: You are somehow able to store e.g. 0000-00-00 00:00:00
          // Protect the code base and return the current date time.
          attrs[key] = new Date(truncateToSeconds(Number.isNaN(ms) ? Date.now() : ms));
        }
      }

      return attrs;
    },

    /**
     * Coerce values to real booleans
     *
     * @param {object} attrs - attributes to convert
     * @returns {object} attrs - converted attributes
     */
    fixBools: function fixBools(attrs) {
      const tableDef = schema.tables[this.tableName];

      if (!tableDef) {
        return attrs;
      }

      for (const key in attrs) {
        const columnDef = tableDef[key];
        if (
          columnDef &&
          columnDef.type === 'boolean' &&
          (!columnDef.nullable || attrs[key] !== null)
        ) {
          attrs[key] = !!attrs[key];
        }
      }

      return attrs;
    },
  });
};
