// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { readBytes } from '../src/shared/body.ts';

/** A body whose cancel fails, as a broken connection's can. */
function unCancellable(chunk: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(chunk);
    },
    cancel() {
      throw new Error('connection reset');
    },
  });
}

describe('readBytes', () => {
  it('says a body is too large even when it fails to be cancelled', async () => {
    const declared = new Response(unCancellable(new Uint8Array(1)), {
      headers: { 'content-length': '5000' },
    });
    await expect(readBytes(declared, 4096)).resolves.toBeUndefined();

    const streamed = new Response(unCancellable(new Uint8Array(1024)));
    await expect(readBytes(streamed, 4096)).resolves.toBeUndefined();
  });
});
