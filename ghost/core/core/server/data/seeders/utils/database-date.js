const {faker} = require('@faker-js/faker');

const databaseDatePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

function dateToDatabaseString(date) {
    if (typeof date === 'string') {
        // SQLite fix when reusing other dates from the db
        return date;
    }
    return date.toISOString().replace('Z','').replace('T', ' ');
}

dateToDatabaseString.parse = function parseDatabaseDate(date) {
    if (date instanceof Date) {
        return new Date(date);
    }

    if (typeof date === 'string' && databaseDatePattern.test(date)) {
        return new Date(date.replace(' ', 'T') + 'Z');
    }

    return new Date(date);
};

dateToDatabaseString.randomBetween = function randomBetween(start, end) {
    const earliest = dateToDatabaseString.parse(start);
    const latest = dateToDatabaseString.parse(end);

    return latest > earliest ? faker.date.between(earliest, latest) : earliest;
};

module.exports = dateToDatabaseString;
