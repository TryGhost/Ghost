const papaparse = require('papaparse');

const RevueImporter = {
    type: 'revue',
    preProcess: function (importData) {
        importData.preProcessedByRevue = true;

        const posts = [];

        if (!importData?.revue?.revue?.issues) {
            return importData;
        }

        const csvData = papaparse.parse(importData.revue.revue.issues, {header: true});

        csvData.data.forEach((issue) => {
            // Convert issues to posts
            if (issue.id.length > 0) {
                posts.push({title: issue.subject});
            }
        });

        importData.data.meta = {version: '5.0.0'};
        importData.data.data = {
            posts
        };

        return importData;
    },
    doImport: function (importData) {
        return importData;
    }
};

module.exports = RevueImporter;
