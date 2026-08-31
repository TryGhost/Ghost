import { describe, expect, it } from 'vitest';

import {
  CUSTOM_NAMESPACE,
  formatIdentity,
  isKnownNamespace,
  parseIdentity,
} from '../src/identity.ts';

describe('parseIdentity', () => {
  it('reads a field identity as namespace then key', () => {
    expect(parseIdentity('custom.company')).toEqual({
      namespace: 'custom',
      key: 'company',
      path: null,
    });
  });

  it('reads everything after the key as the part path', () => {
    expect(parseIdentity('custom.shipping_address.country')).toEqual({
      namespace: 'custom',
      key: 'shipping_address',
      path: 'country',
    });
    expect(parseIdentity('custom.a.b.c')).toEqual({ namespace: 'custom', key: 'a', path: 'b.c' });
  });

  it('parses a well-formed identity in a namespace that does not exist', () => {
    expect(parseIdentity('transistor.private_url')).toEqual({
      namespace: 'transistor',
      key: 'private_url',
      path: null,
    });
  });

  it('refuses anything that is not namespace-dot-key', () => {
    expect(parseIdentity('company')).toBeNull();
    expect(parseIdentity('')).toBeNull();
    expect(parseIdentity('custom.')).toBeNull();
    expect(parseIdentity('.company')).toBeNull();
    expect(parseIdentity('custom..company')).toBeNull();
    expect(parseIdentity('Custom.company')).toBeNull();
    expect(parseIdentity('custom.com pany')).toBeNull();
    expect(parseIdentity('custom.com-pany')).toBeNull();
  });
});

describe('formatIdentity', () => {
  it('round-trips through parseIdentity', () => {
    for (const identity of ['custom.company', 'custom.shipping_address.country', 'custom.a.b.c']) {
      const parsed = parseIdentity(identity);
      expect(parsed).not.toBeNull();
      expect(formatIdentity(parsed!)).toBe(identity);
    }
  });

  it('writes no trailing separator for a field with no part path', () => {
    expect(formatIdentity({ namespace: 'custom', key: 'company', path: null })).toBe(
      'custom.company',
    );
  });
});

describe('isKnownNamespace', () => {
  it('knows the publisher namespace and nothing else yet', () => {
    expect(isKnownNamespace(CUSTOM_NAMESPACE)).toBe(true);
    expect(isKnownNamespace('ghost')).toBe(false);
    expect(isKnownNamespace('transistor')).toBe(false);
  });
});
