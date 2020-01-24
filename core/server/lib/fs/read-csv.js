const Promise = require('bluebird'),
    csvParser = require('csv-parser'),
    _ = require('lodash'),
    fs = require('fs-extra');

module.exports = function readCSV(options) {
    var columnsToExtract = options.columnsToExtract || [],
        results = [], rows = [];

    return new Promise(function (resolve, reject) {
        var readFile = fs.createReadStream(options.path);

        readFile.on('err', function (err) {
            reject(err);
        })
            .pipe(csvParser({
                mapHeaders: ({header}) => {
                    // NOTE: temporary hack to allow this column to be later mapped to 'subscribed'
                    //       these mappings should go away in favor of custom tool that transforms
                    //       csv files into correct format
                    if (header === 'email_disabled') {
                        return 'subscribed';
                    } else if (header === 'stripe_connected_customer_id') {
                        return 'stripe_customer_id';
                    }

                    return header;
                }
            }))
            .on('data', function (row) {
                rows.push(row);
            })
            .on('end', function () {
                // If CSV is single column - return all values including header
                var headers = _.keys(rows[0]), result = {}, columnMap = {};
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
                        var result = {};
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
