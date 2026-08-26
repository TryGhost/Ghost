import { pipeline, Transform } from 'node:stream';
import { IncomingMessage, ServerResponse } from 'node:http';
import { InternalServerError } from '@tryghost/errors';

interface StreamResponseOptions {
  /** Readable producing the response bytes (or rows, when a transform is given). */
  source: NodeJS.ReadableStream;
  /** Optional transform between source and response (e.g. rows → CSV chunks). */
  transform?: Transform;
  /** Filename to advertise in the `Content-Disposition` header. */
  filename: string;
  /** Value for the `Content-Type` header. */
  contentType: string;
  /** Error message when `filename` is missing — format-specific for callers that pin it. */
  missingFilenameMessage?: string;
}

/**
 * Builds the `frame.response` handler for a streaming download, centralising
 * the wiring shared by every streamed export (CSV, zip): the
 * Content-Type/Content-Disposition headers, the `no-transform` cache directive
 * (so proxies don't recompress and corrupt the byte stream), and `pipeline()`
 * piping that tears down every stream on error.
 */
export function createStreamResponse({
  source,
  transform,
  filename,
  contentType,
  missingFilenameMessage = 'Missing export filename',
}: StreamResponseOptions) {
  return function streamResponse(
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) {
    if (!filename) {
      return next(
        new InternalServerError({
          message: missingFilenameMessage,
        }),
      );
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `Attachment; filename="${filename}"`);

    const cacheControl = res.getHeader('Cache-Control');
    const cacheControlDirectives = cacheControl
      ? String(cacheControl)
          .split(',')
          .map((value: string) => value.trim().toLowerCase())
      : [];
    if (!cacheControlDirectives.includes('no-transform')) {
      res.setHeader(
        'Cache-Control',
        cacheControl ? `${cacheControl}, no-transform` : 'no-transform',
      );
    }

    // On success, pipeline has already ended the response and there's no
    // downstream middleware waiting. Only forward errors so the framework's
    // error handler can log them and (if possible) send a status to the client.
    const done = (err?: NodeJS.ErrnoException | null) => {
      if (err) {
        next(err);
      }
    };

    if (transform) {
      pipeline(source, transform, res, done);
    } else {
      pipeline(source, res, done);
    }
  };
}
