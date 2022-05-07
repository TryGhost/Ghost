const BackupsExporter = require('./BackupsExporter');

let backupsExporter;

const getStorage = () => {
    backupsExporter = backupsExporter || new BackupsExporter();
    return backupsExporter;
};

module.exports = {
    getZip: async () => {
        return await getStorage().serve();
    }
};