module.exports = function dateToDatabaseString(date) {
    return date.toISOString().replace('Z','').replace('T', ' ');
};
