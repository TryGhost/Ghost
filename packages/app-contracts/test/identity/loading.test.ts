import { describe, expect, it } from 'vitest';

import {
  MANIFEST_MAX_BYTES,
  SIGNED_MANIFEST_MAX_BYTES,
  parseJsonText,
} from '../../src/identity/index.ts';

describe('the limits Ghost reads a signed manifest with', () => {
  it('fits a manifest of the largest size Ghost stores, in base64url, with its header', () => {
    expect(MANIFEST_MAX_BYTES).toBe(64 * 1024);
    expect(SIGNED_MANIFEST_MAX_BYTES).toBeGreaterThan(Math.ceil((MANIFEST_MAX_BYTES * 4) / 3));
  });
});

describe('parseJsonText', () => {
  it('reads JSON with or without a byte order mark at its start', () => {
    expect(parseJsonText('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonText('﻿{"a":1}')).toEqual({ a: 1 });
  });

  it('refuses anything else that JSON.parse does', () => {
    expect(() => parseJsonText('{"a":1}﻿')).toThrow(SyntaxError);
  });
});
