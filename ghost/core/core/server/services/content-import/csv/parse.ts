import papaparse from 'papaparse';
import fs from 'fs-extra';

const errors = require('@tryghost/errors');

// A parsed CSV row: raw string cells, keyed by (renamed) column.
export type Row = Record<string, string>;

// A column named after an Object.prototype member is unsafe as a key.
function isSafeColumnName(name: string): boolean {
    return !(name in Object.prototype);
}

// Quote errors mean cells are being glued together and rows can no longer be told
// apart, so the file is refused. Ragged rows (FieldMismatch) and delimiter guesses
// stay tolerated: an overflow cell is dropped per row, not per file.
function isFatal(error: papaparse.ParseError): boolean {
    return error.type === 'Quotes';
}

// headerMapping renames headers to the columns they emit under; unmapped columns
// carry through, and one mapped to an empty target is dropped.
export default async function parse(path: string, headerMapping?: Record<string, string>): Promise<Row[]> {
    // Buffered rather than streamed: files are bounded by the interim row cap, and
    // papaparse's stream mode drops results.errors, which is what catches a
    // malformed quoted field before it imports as garbage.
    const content = (await fs.readFile(path, 'utf8')).replace(/^\ufeff/, '');
    const parsed = papaparse.parse<Record<string, unknown>>(content, {
        header: true,
        skipEmptyLines: true
    });

    const fatal = parsed.errors.find(isFatal);
    if (fatal) {
        throw new errors.ValidationError({message: `${fatal.code}: ${fatal.message}`});
    }

    const rows: Row[] = [];

    for (const parsedRow of parsed.data) {
        const row: Row = {};

        for (const [header, value] of Object.entries(parsedRow)) {
            // non-string values are papaparse's __parsed_extra overflow from ragged rows
            if (typeof value !== 'string') {
                continue;
            }

            // hasOwn: a prototype-named header must not match an inherited method on the mapping
            if (headerMapping && Object.hasOwn(headerMapping, header)) {
                if (!headerMapping[header]) {
                    continue;
                }
                row[headerMapping[header]] = value;
            } else if (isSafeColumnName(header)) {
                row[header] = value;
            }
        }

        if (!Object.keys(row).length) {
            continue;
        }

        rows.push(row);
    }

    return rows;
}
