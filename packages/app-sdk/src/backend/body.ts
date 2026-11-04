/**
 * Reads a request's body as UTF-8 text, or `undefined` if it is longer than `maxBytes`. It
 * stops reading as soon as the body passes the limit, so a large body is never held whole.
 * Invalid UTF-8 throws, as the exact text matters to whoever signs it.
 */
export async function readText(request: Request, maxBytes: number): Promise<string | undefined> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > maxBytes) {
    return undefined;
  }
  if (!request.body) {
    return '';
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
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
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
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
