const moment = require('moment');
const { DateTime } = require('luxon');

const schema = require('../../../data/schema');

// What SQLite returns for a dateTime column, and what fixDatesWhenSave writes
const DB_DATETIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

/**
 * @param {number} ms - epoch milliseconds
 * @returns {number} ms rounded down to the whole second
 */
function truncateToSeconds(ms) {
  return Math.floor(ms / 1000) * 1000;
}

/**
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function pad(n, width) {
  return String(n).padStart(width, '0');
}

/**
 * Formats as the `YYYY-MM-DD HH:mm:ss` UTC string the database columns store.
 *
 * @param {number} ms - epoch milliseconds
 * @returns {string}
 */
function formatForDatabase(ms) {
  const date = new Date(ms);
  const year = date.getUTCFullYear();

  return (
    `${year < 0 ? '-' : ''}${pad(Math.abs(year), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)} ` +
    `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}`
  );
}

/**
 * Handles what the database drivers hand back (Dates from MySQL, numbers and
 * `YYYY-MM-DD HH:mm:ss` UTC strings from SQLite) without building a moment,
 * since this runs for every date column of every row. Anything else goes
 * through moment exactly as before.
 *
 * @param {Date|number|string|import('luxon').DateTime|import('moment').Moment} value
 * @returns {number} epoch milliseconds, or NaN when the value is not a valid date
 */
function toEpochMilliseconds(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  // moment would read a Luxon DateTime as today's date at midnight
  if (DateTime.isDateTime(value)) {
    return value.toMillis();
  }

  const match = typeof value === 'string' && DB_DATETIME.exec(value);

  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match.map(Number);
    const ms = Date.UTC(year, month - 1, day, hours, minutes, seconds);

    // Date.UTC rolls over out-of-range parts (2025-02-30, 10:60:00) and maps
    // years below 100 onto 19xx, so only trust it when the result round-trips
    if (formatForDatabase(ms) === value) {
      return ms;
    }
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
          // Matches the string moment's format() produced for invalid input
          attrs[key] = Number.isNaN(ms) ? 'Invalid date' : formatForDatabase(ms);
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
