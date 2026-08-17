const {faker} = require('@faker-js/faker');

const databaseDatePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

/**
 * @param {Readonly<Date | string>} date
 * @returns {string}
 */
function dateToDatabaseString(date) {
    if (typeof date === 'string') {
        // SQLite fix when reusing other dates from the db
        return date;
    }
    return date.toISOString().replace('Z','').replace('T', ' ');
}

/**
 * @param {Readonly<Date | string | number>} date
 * @returns {Date}
 */
dateToDatabaseString.parse = function parseDatabaseDate(date) {
    if (date instanceof Date) {
        return new Date(date);
    }

    if (typeof date === 'string' && databaseDatePattern.test(date)) {
        return new Date(date.replace(' ', 'T') + 'Z');
    }

    return new Date(date);
};

/**
 * @param {Readonly<Date | string | number>} start
 * @param {Readonly<Date | string | number>} end
 * @returns {Date}
 */
dateToDatabaseString.randomBetween = function randomBetween(start, end) {
    const earliest = dateToDatabaseString.parse(start);
    const latest = dateToDatabaseString.parse(end);

    return latest > earliest ? faker.date.between({from: earliest, to: latest}) : earliest;
};

module.exports = dateToDatabaseString;
