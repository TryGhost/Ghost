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

  it('says a body is too large at once when it is one branch of a tee, the other unread', async () => {
    const teed = () => {
      const [branch] = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array(1024));
        },
      }).tee();
      return branch;
    };
    // The cancel of a teed branch waits for the other branch, which nothing here reads.
    const soon = <T>(promise: Promise<T>) =>
      Promise.race([
        promise,
        new Promise((resolve) => {
          setTimeout(() => resolve('still waiting'), 1000);
        }),
      ]);

    const declared = new Request('https://app.example/', {
      method: 'POST',
      body: teed(),
      headers: { 'content-length': '5000' },
      duplex: 'half',
    } as RequestInit);
    expect(await soon(readBytes(declared, 4096))).toBeUndefined();

    const streamed = new Request('https://app.example/', {
      method: 'POST',
      body: teed(),
      duplex: 'half',
    } as RequestInit);
    expect(await soon(readBytes(streamed, 4096))).toBeUndefined();
  });
});
