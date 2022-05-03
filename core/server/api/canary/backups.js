const backupsServices = require('../../services/backups');

module.exports = {
    docName: 'backups',
    download: {
        permissions: false,
        query() {
            return backupsServices.api.exporter();
        }
    }
};
