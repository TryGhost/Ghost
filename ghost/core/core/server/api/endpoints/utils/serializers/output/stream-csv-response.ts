import {pipeline, Readable, Transform} from 'node:stream';
import {IncomingMessage, ServerResponse} from 'node:http';
import {InternalServerError} from '@tryghost/errors';

interface CSVStreamResponseOptions {
    /** Object-mode readable producing the rows to export. */
    source: Readable;
    /** Transform that converts the rows into CSV chunks. */
    transform: Transform;
    /** Filename to advertise in the `Content-Disposition` header. */
    filename: string;
}

/**
 * Builds the `frame.response` handler for a streaming CSV download, centralising
 * the wiring shared by every CSV export: the Content-Type/Content-Disposition
 * headers, the `no-transform` cache directive (so proxies don't recompress and
 * corrupt the byte stream), and `pipeline()` piping that tears down every stream
 * on error.
 */
export function createCSVStreamResponse({source, transform, filename}: CSVStreamResponseOptions) {
    return function streamResponse(req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) {
        if (!filename) {
            return next(new InternalServerError({
                message: 'Missing CSV export filename'
            }));
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `Attachment; filename="${filename}"`);

        const cacheControl = res.getHeader('Cache-Control');
        const cacheControlDirectives = cacheControl ? String(cacheControl).split(',').map((value: string) => value.trim().toLowerCase()) : [];
        if (!cacheControlDirectives.includes('no-transform')) {
            res.setHeader('Cache-Control', cacheControl ? `${cacheControl}, no-transform` : 'no-transform');
        }

        pipeline(source, transform, res, (err) => {
            // On success, pipeline has already ended the response and there's no
            // downstream middleware waiting. Only forward errors so the framework's
            // error handler can log them and (if possible) send a status to the client.
            if (err) {
                next(err);
            }
        });
    };
}
