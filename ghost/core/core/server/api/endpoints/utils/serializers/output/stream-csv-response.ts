import {Readable, Transform} from 'node:stream';
import {createStreamResponse} from './stream-response';

interface CSVStreamResponseOptions {
    /** Object-mode readable producing the rows to export. */
    source: Readable;
    /** Transform that converts the rows into CSV chunks. */
    transform: Transform;
    /** Filename to advertise in the `Content-Disposition` header. */
    filename: string;
}

/**
 * Builds the `frame.response` handler for a streaming CSV download — the
 * shared header/piping wiring lives in `stream-response`.
 */
export function createCSVStreamResponse({source, transform, filename}: CSVStreamResponseOptions) {
    return createStreamResponse({
        source,
        transform,
        filename,
        contentType: 'text/csv; charset=utf-8',
        missingFilenameMessage: 'Missing CSV export filename'
    });
}
