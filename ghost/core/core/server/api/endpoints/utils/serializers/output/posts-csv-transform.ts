/* eslint-disable @typescript-eslint/no-require-imports */
import {Transform, TransformCallback} from 'stream';
const papaparse = require('papaparse');

type Row = Record<string, unknown>;

// Streaming Transform that converts post objects into CSV bytes one row at a time.
// Pipe a Readable of post objects in, pipe CSV bytes out.
export function createCSVTransform(): Transform {
    let fields: string[] | null = null;

    return new Transform({
        objectMode: true,
        transform(post: Row, _encoding: BufferEncoding, callback: TransformCallback) {
            try {
                if (fields === null) {
                    // Lock the column list from the first row's keys, then emit
                    // the header + the row in a single chunk.
                    fields = Object.keys(post);
                    const csv = papaparse.unparse({fields, data: [post]}, {
                        header: true,
                        escapeFormulae: true,
                        newline: '\r\n'
                    });

                    callback(null, csv);
                    return;
                }

                // Subsequent rows reuse the locked-in field list and skip the header.
                const csv = papaparse.unparse({fields, data: [post]}, {
                    header: false,
                    escapeFormulae: true,
                    newline: '\r\n'
                });

                // papaparse never prepends or appends a newline around its output,
                // so we add exactly one CRLF to separate this row from the previous.
                callback(null, '\r\n' + csv);
            } catch (err) {
                callback(err as Error);
            }
        }
    });
}
