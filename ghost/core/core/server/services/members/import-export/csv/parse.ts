import {pipeline} from 'node:stream';
import papaparse from 'papaparse';
import fs from 'fs-extra';

// A parsed CSV row: raw string cells, keyed by (renamed) column. The reader is purely
// mechanical -- it knows BOM, ragged rows, column renaming and prototype-safety, but
// nothing about what a column means. Giving the columns meaning and coercing their
// values is the domain's job (see the import schema).
export type Row = Record<string, string>;

/**
 * @param path - The path to the CSV to read
 * @param headerMapping - Maps a header in the input CSV to the column name to emit it
 *   under. Unmapped columns are carried through under their own name.
 * @returns The rows as raw string cells
 */
export default function parse(path: string, headerMapping?: Record<string, string>): Promise<Row[]> {
    return new Promise(function (resolve, reject) {
        const csvFileStream = fs.createReadStream(path);
        const csvParserStream = papaparse.parse(papaparse.NODE_STREAM_INPUT, {
            header: true
        });

        const rows: Row[] = [];
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
                const row: Row = {};

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
                        row[headerMapping[header]] = value;
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

                rows.push(row);
            } catch (err) {
                reject(err);
            }
        });
    });
}
