const moment = require('moment');
const {chainTransformers} = require('@tryghost/mongo-utils');
const schemaTables = require('../../../data/schema/schema');

// Date columns are stored as "YYYY-MM-DD HH:MM:SS" (UTC). NQL normalizes relative
// dates (e.g. `now-30d`) to that format, but absolute values from a filter
// (e.g. `published_at:>'2025-02-27T19:03:00.000-05:00'`) are passed through as-is.
// On SQLite, datetimes are stored as text and compared lexically, so the "T"
// sorts after the space separator and the comparison returns the wrong rows.
// We normalize those values to the stored format before the query is built.
// See https://github.com/TryGhost/Ghost/issues/23441
const ACCEPTED_DATE_FORMATS = [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss'];
const DB_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// Columns to treat as dates, keyed by column name. A name only qualifies when
// it is a `dateTime` in every table that has it, so we never normalize a value
// for a same-named column of another type. Filters resolve by column name (the
// trailing segment), which keeps relation-qualified fields like `tags.created_at`
// working without needing the model's table.
let dateColumns = null;
const getDateColumns = () => {
    if (!dateColumns) {
        const otherColumns = new Set();
        dateColumns = new Set();

        for (const columns of Object.values(schemaTables)) {
            for (const [name, spec] of Object.entries(columns)) {
                if (spec && spec.type === 'dateTime') {
                    dateColumns.add(name);
                } else if (spec && spec.type) {
                    otherColumns.add(name);
                }
            }
        }

        otherColumns.forEach(name => dateColumns.delete(name));
    }
    return dateColumns;
};

const isDateColumn = (key) => {
    const column = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key;
    return getDateColumns().has(column);
};

// Reformat a single value to the database date format. Non-strings and values we
// can't parse as a date are returned untouched, so unexpected input is never
// corrupted.
const normalizeValue = (value) => {
    if (typeof value !== 'string') {
        return value;
    }

    const parsed = moment.utc(value, ACCEPTED_DATE_FORMATS, true);
    return parsed.isValid() ? parsed.format(DB_DATE_FORMAT) : value;
};

// An operator map like `{$gt: ...}`: a plain object whose keys are all operators.
// Anything else that happens to be an object (e.g. a `Date`) is not one and must
// be left untouched rather than reduced to `{}`.
const isOperatorMap = (value) => {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') {
        return false;
    }

    const keys = Object.keys(value);
    return keys.length > 0 && keys.every(key => key.charAt(0) === '$');
};

// A field value is a plain value (equality), an array (e.g. `$in`), or an operator
// map (e.g. `{$gt: ...}`).
const normalizeFieldValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(normalizeValue);
    }

    if (isOperatorMap(value)) {
        const result = {};
        for (const [operator, operatorValue] of Object.entries(value)) {
            result[operator] = Array.isArray(operatorValue)
                ? operatorValue.map(normalizeValue)
                : normalizeValue(operatorValue);
        }
        return result;
    }

    return normalizeValue(value);
};

// Walk the parsed mongo-JSON filter, normalizing date column values and recursing
// into `$and`/`$or` groups.
const normalizeDateFilters = (node) => {
    if (Array.isArray(node)) {
        return node.map(normalizeDateFilters);
    }

    if (!node || typeof node !== 'object') {
        return node;
    }

    const result = {};
    for (const [key, value] of Object.entries(node)) {
        if (key.charAt(0) === '$') {
            result[key] = normalizeDateFilters(value);
        } else if (isDateColumn(key)) {
            result[key] = normalizeFieldValue(value);
        } else {
            result[key] = value;
        }
    }
    return result;
};

/**
 * Normalizes absolute date values in NQL filters to the database date format, so
 * date comparisons behave the same on SQLite and MySQL. Wraps
 * `applyDefaultAndCustomFilters` and chains the date transformer after any
 * transformer the caller supplied.
 *
 * @param {import('bookshelf')} Bookshelf
 */
module.exports = function (Bookshelf) {
    const parentApply = Bookshelf.Model.prototype.applyDefaultAndCustomFilters;

    Bookshelf.Model = Bookshelf.Model.extend({
        applyDefaultAndCustomFilters: function applyDefaultAndCustomFilters(options = {}) {
            const mongoTransformer = options.mongoTransformer
                ? chainTransformers(options.mongoTransformer, normalizeDateFilters)
                : normalizeDateFilters;

            return parentApply.call(this, Object.assign({}, options, {mongoTransformer}));
        }
    });
};

module.exports.normalizeDateFilters = normalizeDateFilters;
