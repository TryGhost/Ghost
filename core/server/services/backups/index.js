const {getZip, initialize} = require('./backups');

module.exports = {
    /**
     * Methods used in the API
     */
    api: {
        exporter: getZip,
        initializeImageZipping: initialize
    }
};
