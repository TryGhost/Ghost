import {pipeline} from 'node:stream';
import papaparse from 'papaparse';
import fs from 'fs-extra';

// A parsed CSV row: raw string cells, keyed by (renamed) column. Parsing is mechanical;
// giving the columns meaning and coercing their values is the domain's job (the import
// schema).
export type Row = Record<string, string>;

// A column named after an Object.prototype member (toString, __proto__, ...) is unsafe
// as a key: writing it would shadow a method or reach the prototype.
function isSafeColumnName(name: string): boolean {
    return !(name in Object.prototype);
}

// headerMapping renames the CSV's headers to the columns they emit under; unmapped
// columns carry through under their own name, and one mapped to an empty target is
// dropped.
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

                    // hasOwn, not `in`: a prototype-named header would otherwise match an
                    // inherited method on the mapping and take a function as its mapped name.
                    if (headerMapping && Object.hasOwn(headerMapping, header)) {
                        // An empty target is the caller naming a column to leave out, which
                        // it has to name: an unnamed column carries through below, and for a
                        // custom_fields.* column carrying through means being imported. So
                        // omitting a column from the mapping is the opposite of excluding it.
                        if (!headerMapping[header]) {
                            continue;
                        }
                        row[headerMapping[header]] = value;
                    } else if (isSafeColumnName(header)) {
                        // Carry any unmapped column through untouched, so the import is not
                        // constrained to a known vocabulary: a custom_fields.* column
                        // survives parsing even though nothing consumes it yet.
                        row[header] = value;
                    }
                }

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
