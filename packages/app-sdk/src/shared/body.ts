/**
 * Reads a request's or a response's body, or `undefined` if it is longer than `maxBytes`. It
 * stops reading as soon as the body passes the limit, so a large body is never held whole.
 */
export async function readBytes(
  message: Request | Response,
  maxBytes: number,
): Promise<Uint8Array | undefined> {
  if (Number(message.headers.get('content-length')) > maxBytes) {
    await message.body?.cancel();
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
  return bytes;
}
