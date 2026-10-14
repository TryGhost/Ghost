import { describe, expect, it } from 'vitest';

import {
  CONNECT_MESSAGE_TYPE,
  HELLO_MESSAGE_TYPE,
  HelloMessageSchema,
  START_TIMEOUT_MS,
} from '../../src/bridge/index.ts';

describe('the window messages', () => {
  it('keeps the message types stable', () => {
    expect(HELLO_MESSAGE_TYPE).toBe('ghost-app:hello');
    expect(CONNECT_MESSAGE_TYPE).toBe('ghost-app:connect');
  });

  it('gives a page ten seconds to start', () => {
    expect(START_TIMEOUT_MS).toBe(10_000);
  });

  it("accepts a hello naming the SDK version and the page's document", () => {
    const hello = { type: 'ghost-app:hello', sdk: '1.2.3', document: 'a1b2c3' };
    expect(HelloMessageSchema.parse(hello)).toEqual(hello);
  });

  it('drops fields a newer SDK adds to its hello rather than refusing it', () => {
    expect(
      HelloMessageSchema.parse({
        type: 'ghost-app:hello',
        sdk: '9.0.0',
        document: 'a1b2c3',
        capabilities: [],
      }),
    ).toEqual({ type: 'ghost-app:hello', sdk: '9.0.0', document: 'a1b2c3' });
  });

  it('refuses anything else a window may be sent', () => {
    for (const data of [
      null,
      'ghost-app:hello',
      { type: 'ghost-app:connect', sdk: '1.0.0' },
      { type: 'ghost-app:hello', document: 'a1b2c3' },
      { type: 'ghost-app:hello', sdk: 1, document: 'a1b2c3' },
      { type: 'ghost-app:hello', sdk: 'x'.repeat(101), document: 'a1b2c3' },
      { type: 'ghost-app:hello', sdk: '1.0.0' },
      { type: 'ghost-app:hello', sdk: '1.0.0', document: 1 },
      { type: 'ghost-app:hello', sdk: '1.0.0', document: '' },
      { type: 'ghost-app:hello', sdk: '1.0.0', document: 'x'.repeat(65) },
    ]) {
      expect(HelloMessageSchema.safeParse(data).success).toBe(false);
    }
  });
});
