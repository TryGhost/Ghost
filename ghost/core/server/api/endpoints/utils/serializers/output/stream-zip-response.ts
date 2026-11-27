import { createStreamResponse } from './stream-response';

interface ZipStreamResponseOptions {
  /** Readable producing the zip bytes (e.g. an archiver instance). */
  source: NodeJS.ReadableStream;
  /** Filename to advertise in the `Content-Disposition` header. */
  filename: string;
}

/**
 * Builds the `frame.response` handler for a streaming zip download — the
 * shared header/piping wiring lives in `stream-response`.
 */
export function createZipStreamResponse({ source, filename }: ZipStreamResponseOptions) {
  return createStreamResponse({
    source,
    filename,
    contentType: 'application/zip',
    missingFilenameMessage: 'Missing zip export filename',
  });
}
