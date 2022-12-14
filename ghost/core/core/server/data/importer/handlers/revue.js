const _ = require('lodash');
const fs = require('fs-extra');

const hasIssuesCSV = (files) => {
    return _.some(files, (file) => {
        return file.name.match(/^issues.*?\.csv/);
    });
};

const RevueHandler = {
    type: 'revue',
    extensions: ['.csv', '.json'],
    contentTypes: ['application/octet-stream', 'application/json', 'text/plain'],
    directories: [],

    loadFile: function (files, startDir) {
        const startDirRegex = startDir ? new RegExp('^' + startDir + '/') : new RegExp('');
        const idRegex = /_[^_]*?\./;
        const ops = [];
        const revue = {};

        if (!hasIssuesCSV(files)) {
            return;
        }

        _.each(files, function (file) {
            ops.push(fs.readFile(file.path).then(function (content) {
                // normalize the file name
                file.name = file.name.replace(startDirRegex, '').replace(idRegex, '.');

                const name = file.name.split('.')[0];

                revue[name] = content.toString();
            }));
        });

        return Promise.all(ops).then(() => {
            return {meta: {revue: true}, revue};
        });
    }
};

module.exports = RevueHandler;
