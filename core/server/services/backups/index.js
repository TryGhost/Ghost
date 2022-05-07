const {getZip} = require('./backups');

module.exports = {
    /**
     * Methods used in the API
     */
    api: {
        exporter: getZip
    }
};
