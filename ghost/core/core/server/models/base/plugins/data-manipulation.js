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
 * Stored dates are UTC, so strings are parsed in UTC regardless of the
 * process timezone - `new Date(string)` would read `2018-04-12 20:50:35` as
 * local time.
 *
 * @param {Date|number|string|import('luxon').DateTime|{_isAMomentObject: true, valueOf(): number}} value
 * @returns {number} epoch milliseconds, or NaN when the value is not a valid date
 */
function toEpochMilliseconds(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  // moment objects still come in from callers that build dates with moment
  if (value?._isAMomentObject || DateTime.isDateTime(value)) {
    return value.valueOf();
  }

  const str = String(value);
  let date = DateTime.fromSQL(str, { zone: 'utc' });

  if (!date.isValid) {
    date = DateTime.fromISO(str, { zone: 'utc' });
  }

  return date.isValid ? date.toMillis() : NaN;
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
