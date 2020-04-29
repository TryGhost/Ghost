const Promise = require('bluebird');
const csvParser = require('csv-parser');
const _ = require('lodash');
const fs = require('fs-extra');

module.exports = function readCSV(options) {
    const columnsToExtract = options.columnsToExtract || [];
    let results = [];
    const rows = [];

    return new Promise(function (resolve, reject) {
        const readFile = fs.createReadStream(options.path);

        readFile.on('err', function (err) {
            reject(err);
        })
            .pipe(csvParser())
            .on('data', function (row) {
                rows.push(row);
            })
            .on('end', function () {
            // If CSV is single column - return all values including header
                const headers = _.keys(rows[0]);

                let result = {};
                const columnMap = {};
                if (columnsToExtract.length === 1 && headers.length === 1) {
                    results = _.map(rows, function (value) {
                        result = {};
                        result[columnsToExtract[0].name] = value[headers[0]];
                        return result;
                    });
                } else {
                // If there are multiple columns in csv file
                // try to match headers using lookup value

                    _.map(columnsToExtract, function findMatches(column) {
                        _.each(headers, function checkheader(header) {
                            if (column.lookup.test(header)) {
                                columnMap[column.name] = header;
                            }
                        });
                    });

                    results = _.map(rows, function evaluateRow(row) {
                        const result = {};
                        _.each(columnMap, function returnMatches(value, key) {
                            result[key] = row[value];
                        });
                        return result;
                    });
                }
                resolve(results);
            });
    });
};
