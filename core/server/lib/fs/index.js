module.exports = {
    get readCSV() {
        return require('./read-csv');
    },

    get formatCSV() {
        return require('./format-csv');
    },

    get zipFolder() {
        return require('./zip-folder');
    }
};
