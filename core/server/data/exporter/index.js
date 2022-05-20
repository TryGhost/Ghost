const {BACKUP_TABLES, TABLES_ALLOWLIST} = require('./table-lists');

module.exports = {
    doExport: require('./exporter'),
    fileName: require('./export-filename'),
    BACKUP_TABLES,
    TABLES_ALLOWLIST
};
