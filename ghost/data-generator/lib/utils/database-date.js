module.exports = function dateToDatabaseString(date) {
    if (typeof date === 'string') {
        // SQLite fix when reusing other dates from the db
        return date;
    }
    return date.toISOString().replace('Z','').replace('T', ' ');
};
