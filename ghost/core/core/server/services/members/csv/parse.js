const {pipeline} = require('node:stream');
const papaparse = require('papaparse');
const fs = require('fs-extra');

const transformValue = (header, value) => {
    if (header === 'labels') {
        if (value && typeof value === 'string') {
            return value.split(',').map(name => ({name}));
        }
        return [];
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
};

/**
 * @param {string} path - The path to the CSV to prepare
 * @param {Object.<string, string>} headerMapping - An object whose keys are headers in the input CSV and values are the header to replace it with
 * @param {Array<string>} [defaultLabels] - A list of labels to apply to every parsed member row
 * @returns {Promise<Array<Object>>} The parsed member rows, keyed by mapped header
 */
module.exports = (path, headerMapping, defaultLabels = []) => {
    return new Promise(function (resolve, reject) {
        const csvFileStream = fs.createReadStream(path);
        const csvParserStream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {
            header: true
        });

        const rows = [];
        const parsedCSVStream = pipeline(csvFileStream, csvParserStream, (err) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });

        parsedCSVStream.on('data', (parsedRow) => {
            // a throw here escapes as an uncaught exception and leaves this
            // promise forever unsettled, so it has to become a rejection
            try {
                const row = {};

                for (const [header, value] of Object.entries(parsedRow)) {
                    // papaparse gathers the overflow from a row carrying more
                    // fields than there are headers under __parsed_extra, as an
                    // array rather than a cell any mapping can name
                    if (typeof value !== 'string') {
                        continue;
                    }

                    // hasOwn, not `in`: a column named after an Object.prototype
                    // member would otherwise pass as mapped and take a function
                    // as its mapped name
                    if (!headerMapping || !Object.hasOwn(headerMapping, header)) {
                        continue;
                    }

                    const mappedHeader = headerMapping[header];
                    row[mappedHeader] = transformValue(mappedHeader, value);
                }

                // skip a rows with no data
                if (!Object.keys(row).length){
                    return;
                }

                // labels is absent when the column is unmapped, and an array otherwise
                row.labels = [...(row.labels ?? []), ...defaultLabels];

                rows.push(row);
            } catch (err) {
                reject(err);
            }
        });
    });
};
