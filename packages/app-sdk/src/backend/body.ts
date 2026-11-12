import { ignoreError } from '../shared/ignore.ts';

/**
 * Reads a request's or a response's body, or `undefined` if it is longer than `maxBytes`. It
 * stops reading as soon as the body passes the limit, so a large body is never held whole.
 */
export async function readBytes(
  message: Request | Response,
  maxBytes: number,
): Promise<Uint8Array | undefined> {
  if (Number(message.headers.get('content-length')) > maxBytes) {
    // Too large either way, so a body that refuses to be cancelled changes nothing. Not waited
    // for: one branch of a teed body, as a cloned request's is, cancels only once the other does.
    message.body?.cancel().catch(ignoreError);
    return undefined;
  }
  if (!message.body) {
    return new Uint8Array();
  }
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    length += value.byteLength;
    if (length > maxBytes) {
      reader.cancel().catch(ignoreError);
      return undefined;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Reads a request's body as UTF-8 text, or `undefined` if it is longer than `maxBytes`. Invalid
 * UTF-8 throws, as the exact text matters to whoever signs it.
 */
export async function readText(request: Request, maxBytes: number): Promise<string | undefined> {
  const bytes = await readBytes(request, maxBytes);
  return bytes && new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}
