const Promise = require('bluebird');
const csvParser = require('csv-parser');
const _ = require('lodash');
const fs = require('fs-extra');
const {formatCSV} = require('../../lib/fs');

const readNormalizedJSON = async (options) => {
    const columnsToExtract = options.columnsToExtract || [];
    const columnsToMap = options.columnsToMap || [];
    let results = [];
    const rows = [];
    // NOTE: this variable is a mega hack, but it's the easiest way to determine if
    //       the file we are trying to normalize has the fields to be normalized
    //       ideally if extracted to SDK and performance doesn't matter, can read
    //       the headers of CSV as separate operation and determine based on that
    let usedNormalizationMapping = 0;

    return new Promise(function (resolve, reject) {
        let readFile = fs.createReadStream(options.path);

        readFile.on('err', function (err) {
            reject(err);
        })
            .pipe(csvParser({
                mapHeaders: ({header}) => {
                    let mapping = columnsToMap.find(column => (column.from === header));
                    if (mapping) {
                        usedNormalizationMapping += 1;
                        return mapping.to;
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
                            const mapping = columnsToMap.find(column => (column.to === key));

                            if (mapping && mapping.negate) {
                                result[key] = !(row[value]);
                            } else {
                                result[key] = row[value];
                            }
                        });
                        return result;
                    });
                }

                resolve({results, usedNormalizationMapping});
            });
    });
};

// NOTE: this whole module belongs in the SDK and ideally should not be used from within Ghost
module.exports = async function normalizeMembersCSV(options) {
    const {results, usedNormalizationMapping} = await readNormalizedJSON(options);

    // NOTE: if the normalized file didn't use any of the mappings it's a native Ghost export file
    //       in which case, no file modification should be done
    if (usedNormalizationMapping < 2) {
        return;
    }

    let fields = ['email', 'name', 'note', 'subscribed', 'stripe_customer_id'];

    if (results && results.length) {
        fields = Object.keys(results[0]);
    }

    const normalizedCSV = formatCSV(results, fields);

    return fs.writeFile(options.path, normalizedCSV);
};
