import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';

import {
  IdentitySchema,
  IdentityTextSchema,
  KeySchema,
  NamespaceSchema,
  PartSchema,
} from '../src/identity.ts';

describe('an identity as text', () => {
  it('reads a field identity as namespace then key', () => {
    expect(z.decode(IdentityTextSchema, 'custom.company')).toEqual({
      namespace: 'custom',
      key: 'company',
      parts: [],
    });
  });

  it('reads everything after the key as parts', () => {
    expect(z.decode(IdentityTextSchema, 'custom.shipping_address.country')).toEqual({
      namespace: 'custom',
      key: 'shipping_address',
      parts: ['country'],
    });
    expect(z.decode(IdentityTextSchema, 'custom.a.b.c')).toEqual({
      namespace: 'custom',
      key: 'a',
      parts: ['b', 'c'],
    });
  });

  it('reads any namespace: namespaces are data, not a registry', () => {
    expect(z.decode(IdentityTextSchema, 'transistor.private_url')).toEqual({
      namespace: 'transistor',
      key: 'private_url',
      parts: [],
    });
  });

  it('refuses anything that is not namespace-dot-key', () => {
    for (const text of [
      'company',
      '',
      'custom.',
      '.company',
      'custom..company',
      'Custom.company',
      'custom.com pany',
      'custom.com-pany',
      'custom.shipping_address.Country',
    ]) {
      expect(z.safeDecode(IdentityTextSchema, text).success, text).toBe(false);
    }
  });

  it('writes an identity out as it was read', () => {
    for (const text of ['custom.company', 'custom.shipping_address.country', 'custom.a.b.c']) {
      expect(z.encode(IdentityTextSchema, z.decode(IdentityTextSchema, text))).toBe(text);
    }
  });
});

describe('an identity arriving as segments', () => {
  it('names a whole field when it has no parts', () => {
    expect(IdentitySchema.parse({ namespace: 'custom', key: 'company' })).toEqual({
      namespace: 'custom',
      key: 'company',
      parts: [],
    });
  });

  it('checks every segment it is given', () => {
    expect(IdentitySchema.safeParse({ namespace: 'Custom', key: 'company' }).success).toBe(false);
    expect(IdentitySchema.safeParse({ namespace: 'custom', key: 'com-pany' }).success).toBe(false);
    expect(
      IdentitySchema.safeParse({ namespace: 'custom', key: 'address', parts: ['Country'] }).success,
    ).toBe(false);
  });
});

describe('a segment', () => {
  it('follows the same rule as a namespace, a key or a part', () => {
    for (const segment of [NamespaceSchema, KeySchema, PartSchema]) {
      expect(segment.safeParse('shipping_address_2').success).toBe(true);
      for (const text of ['', 'Company', 'com-pany', 'com.pany', 'com pany']) {
        expect(segment.safeParse(text).success, text).toBe(false);
      }
    }
  });
});
