const Promise = require('bluebird');
const papaparse = require('papaparse');
const _ = require('lodash');
const fs = require('fs-extra');

const mapRowsWithRegexes = (rows, columnsToExtract) => {
    let results = [];
    const columnMap = {};
    // If CSV is single column - return all values including header
    const headers = _.keys(rows[0]);

    if (columnsToExtract.length === 1 && headers.length === 1) {
        results = _.map(rows, function (value) {
            let result = {};
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

    return results;
};

const mapRowsWithMappings = (rows, mapping) => {
    const results = rows.map((row) => {
        for (const key in mapping) {
            row[key] = row[mapping[key]];

            if (key !== mapping[key]) {
                delete row[mapping[key]];
            }
        }

        return row;
    });

    return results;
};

const readCSV = ({path, columnsToExtract, mapping}) => {
    const rows = [];

    return new Promise(function (resolve, reject) {
        const readFile = fs.createReadStream(path);

        readFile.on('err', function (err) {
            reject(err);
        })
            .pipe(papaparse.parse(papaparse.NODE_STREAM_INPUT, {
                header: true
            }))
            .on('data', function (row) {
                rows.push(row);
            })
            .on('end', function () {
                let results = [];

                if (columnsToExtract) {
                    results = mapRowsWithRegexes(rows, columnsToExtract);
                } else {
                    results = mapRowsWithMappings(rows, mapping);
                }

                resolve(results);
            });
    });
};

const parse = async (filePath, mapping) => {
    const columnsToExtract = [{
        name: 'email',
        lookup: /^email/i
    }, {
        name: 'name',
        lookup: /name/i
    }, {
        name: 'note',
        lookup: /note/i
    }, {
        name: 'subscribed_to_emails',
        lookup: /subscribed_to_emails/i
    }, {
        name: 'stripe_customer_id',
        lookup: /stripe_customer_id/i
    }, {
        name: 'complimentary_plan',
        lookup: /complimentary_plan/i
    }, {
        name: 'labels',
        lookup: /labels/i
    }, {
        name: 'created_at',
        lookup: /created_at/i
    }];

    const options = {
        path: filePath
    };

    if (mapping) {
        options.mapping = mapping;
    } else {
        options.columnsToExtract = columnsToExtract;
    }

    return await readCSV(options);
};

module.exports = parse;
module.exports.readCSV = readCSV;
