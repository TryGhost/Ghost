import { describe, expect, it } from 'vitest';

import {
  CONNECT_MESSAGE_TYPE,
  ConnectMessageSchema,
  HELLO_MESSAGE_TYPE,
  HelloMessageSchema,
} from '../../src/bridge/index.ts';

describe('the window messages', () => {
  it('keeps the message types stable', () => {
    expect(HELLO_MESSAGE_TYPE).toBe('ghost-app:hello');
    expect(CONNECT_MESSAGE_TYPE).toBe('ghost-app:connect');
  });

  it('accepts a hello naming the SDK version', () => {
    expect(HelloMessageSchema.parse({ type: 'ghost-app:hello', sdk: '1.2.3' })).toEqual({
      type: 'ghost-app:hello',
      sdk: '1.2.3',
    });
  });

  it('drops fields a newer SDK adds to its hello rather than refusing it', () => {
    expect(
      HelloMessageSchema.parse({ type: 'ghost-app:hello', sdk: '9.0.0', capabilities: [] }),
    ).toEqual({ type: 'ghost-app:hello', sdk: '9.0.0' });
  });

  it('refuses anything else a window may be sent', () => {
    for (const data of [
      null,
      'ghost-app:hello',
      { type: 'ghost-app:connect', sdk: '1.0.0' },
      { type: 'ghost-app:hello' },
      { type: 'ghost-app:hello', sdk: 1 },
      { type: 'ghost-app:hello', sdk: 'x'.repeat(101) },
    ]) {
      expect(HelloMessageSchema.safeParse(data).success).toBe(false);
    }
  });

  it('accepts a connect and refuses a hello in its place', () => {
    expect(ConnectMessageSchema.parse({ type: 'ghost-app:connect' })).toEqual({
      type: 'ghost-app:connect',
    });
    expect(ConnectMessageSchema.safeParse({ type: 'ghost-app:hello', sdk: '1' }).success).toBe(
      false,
    );
  });
});
