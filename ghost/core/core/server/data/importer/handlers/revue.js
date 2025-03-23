const _ = require('lodash');
const fs = require('fs-extra');
const debug = require('@tryghost/debug')('importer:handler:revue');

const hasIssuesCSV = (files, startDirRegex) => {
    return _.some(files, (file) => {
        const name = file.name.replace(startDirRegex, '');
        return name.match(/^issues.*?\.csv/);
    });
};

const RevueHandler = {
    type: 'revue',
    extensions: ['.csv', '.json'],
    contentTypes: ['application/octet-stream', 'application/json', 'text/plain'],
    directories: [],

    loadFile: function (files, startDir) {
        debug('loadFile', files);
        const startDirRegex = startDir ? new RegExp('^' + startDir + '/') : new RegExp('');
        const idRegex = /_.*?\./;
        const ops = [];
        const revue = {};

        if (!hasIssuesCSV(files, startDirRegex)) {
            debug('No issue CSV');
            return Promise.resolve();
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
