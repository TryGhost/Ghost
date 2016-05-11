var readline = require('readline'),
    Promise = require('bluebird'),
    lodash = require('lodash'),
    errors = require('../errors'),
    fs = require('fs');

function readCSV(options) {
    var path = options.path,
        columnsToExtract = options.columnsToExtract || [],
        firstLine = true,
        mapping = {},
        toReturn = [],
        rl;

    return new Promise(function (resolve, reject) {
        rl = readline.createInterface({
            input: fs.createReadStream(path),
            terminal: false
        });

        rl.on('line', function (line) {
            var values = line.split(','),
                entry = {};

            // CASE: column headers
            if (firstLine) {
                if (values.length === 1) {
                    mapping[columnsToExtract[0]] = 0;
                } else {
                    try {
                        lodash.each(columnsToExtract, function (columnToExtract) {
                            mapping[columnToExtract] = lodash.findIndex(values, function (value) {
                                if (value.match(columnToExtract)) {
                                    return true;
                                }
                            });

                            // CASE: column does not exist
                            if (mapping[columnToExtract] === -1) {
                                throw new errors.ValidationError(
                                    'Column header missing: "{{column}}".'.replace('{{column}}', columnToExtract)
                                );
                            }
                        });
                    } catch (err) {
                        reject(err);
                    }
                }

                firstLine = false;
            } else {
                lodash.each(mapping, function (index, columnName) {
                    entry[columnName] = values[index];
                });

                toReturn.push(entry);
            }
        });

        rl.on('close', function () {
            resolve(toReturn);
        });
    });
}

module.exports = readCSV;
