const Promise = require('bluebird');
const pump = require('pump');
const papaparse = require('papaparse');
const fs = require('fs-extra');

module.exports = (path, mapping, defaultLabels = []) => {
    return new Promise(function (resolve, reject) {
        const csvFileStream = fs.createReadStream(path);
        const csvParserStream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {
            header: true,
            transformHeader(_header) {
                let header = _header;
                if (mapping && Reflect.has(mapping, _header)) {
                    header = mapping[_header];
                }
                if (header === 'subscribed_to_emails') {
                    return 'subscribed';
                }
                return header;
            },
            transform(value, header) {
                if (header === 'labels') {
                    if (value && typeof value === 'string') {
                        return value.split(',').map(name => ({name}));
                    }
                }

                if (header === 'subscribed') {
                    return value.toLowerCase() !== 'false';
                }

                if (header === 'complimentary_plan') {
                    return value.toLowerCase() === 'true';
                }

                if (value === '') {
                    return null;
                }

                if (value === 'undefined') {
                    return null;
                }

                if (value.toLowerCase() === 'false') {
                    return false;
                }

                if (value.toLowerCase() === 'true') {
                    return true;
                }

                return value;
            }
        });

        const rows = [];
        const parsedCSVStream = pump(csvFileStream, csvParserStream, (err) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });

        parsedCSVStream.on('data', (row) => {
            if (row.labels) {
                row.labels = row.labels.concat(defaultLabels);
            } else {
                row.labels = defaultLabels;
            }
            rows.push(row);
        });
    });
};

// @TODO do we need this???
module.exports.readCSV = ({path, mapping, defaultLabels}) => module.exports(path, mapping, defaultLabels);
