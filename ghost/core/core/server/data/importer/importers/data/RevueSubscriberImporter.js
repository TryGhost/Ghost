const debug = require('@tryghost/debug')('importer:revue-subscriber');
const BaseImporter = require('./Base');

const papaparse = require('papaparse');
const path = require('path');
const fs = require('fs-extra');

const config = require('../../../../../shared/config');
const models = require('../../../../models');

class RevueSubscriberImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Member',
            dataKeyToImport: 'revue_subscribers'
        });
    }

    beforeImport() {
        debug('beforeImport');
        return super.beforeImport();
    }

    async doImport(options, importOptions) {
        debug('doImport', this.modelName, this.dataToImport.length);

        // Don't do anything if there is no data to import
        if (this.dataToImport.length === 0) {
            return Promise.resolve();
        }

        // required here rather than top-level to avoid pulling in before it's initialized during boot
        const membersService = require('../../../../services/members');

        const importLabel = importOptions.importTag ? importOptions.importTag.replace(/^#/, '') : null;

        const outputFileName = `Converted ${importLabel}.csv`;
        const outputFilePath = path.join(config.getContentPath('data'), '/', outputFileName);
        const csvData = papaparse.unparse(this.dataToImport);

        const memberImporterOptions = {
            pathToCSV: outputFilePath,
            globalLabels: [{name: importLabel}],
            importLabel: {name: importLabel},
            LabelModel: models.Label,
            forceInline: true
        };

        await fs.writeFile(outputFilePath, csvData);

        return membersService.processImport(memberImporterOptions);
    }
}

module.exports = RevueSubscriberImporter;
