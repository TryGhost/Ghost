import {pipeline} from 'node:stream';
import papaparse from 'papaparse';
import fs from 'fs-extra';
import type {Label, CsvRow, ParsedCsvRow} from './types';

type CsvValue = string | boolean | null | Label[];

export const transformValue = (header: string, value: string): CsvValue => {
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
 * @param path - The path to the CSV to prepare
 * @param headerMapping - An object whose keys are headers in the input CSV and values are the header to replace it with
 * @param defaultLabels - A list of labels to apply to every parsed member row
 * @returns The parsed member rows, keyed by mapped header
 */
export default function parse(
    path: string,
    headerMapping?: Record<string, string>,
    defaultLabels: Label[] = []
): Promise<ParsedCsvRow[]> {
    return new Promise(function (resolve, reject) {
        const csvFileStream = fs.createReadStream(path);
        const csvParserStream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {
            header: true
        });

        const rows: ParsedCsvRow[] = [];
        const parsedCSVStream = pipeline(csvFileStream, csvParserStream, (err) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });

        parsedCSVStream.on('data', (parsedRow: Record<string, unknown>) => {
            // a throw here escapes as an uncaught exception and leaves this
            // promise forever unsettled, so it has to become a rejection
            try {
                const row: CsvRow = {};

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
                    if (headerMapping && Object.hasOwn(headerMapping, header)) {
                        const mappedHeader = headerMapping[header];
                        row[mappedHeader] = transformValue(mappedHeader, value);
                    } else if (!(header in Object.prototype)) {
                        // Carry any unmapped column through untouched, so the import is
                        // not constrained to a known vocabulary: a custom_fields.* column
                        // survives parsing even though nothing consumes it yet. A column
                        // named after an Object.prototype member (toString, __proto__, ...)
                        // is dropped, so a carried row can never shadow a prototype method
                        // or reach the prototype.
                        row[header] = value;
                    }
                }

                // skip rows with no data
                if (!Object.keys(row).length) {
                    return;
                }

                // labels is absent when the column is unmapped, and an array otherwise.
                // Normalise to Label objects so the parsed row's labels are always
                // Label[], the guarantee ParsedCsvRow makes to its consumers.
                const parsedLabels = Array.isArray(row.labels) ? row.labels : [];
                rows.push({
                    ...row,
                    labels: [
                        ...parsedLabels.map(label => (typeof label === 'string' ? {name: label} : label)),
                        ...defaultLabels
                    ]
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}
