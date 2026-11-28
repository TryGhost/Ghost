import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import { browseResponse, resourceResponse } from '../src/index.ts';

const item = z.strictObject({ name: z.string() });
const pagination = { page: 1, limit: 15, pages: 1, total: 1, next: null, prev: null };

describe('browseResponse', function () {
  const schema = browseResponse('tags', item);

  it('requires the items and pagination meta', function () {
    assert.ok(schema.safeParse({ tags: [{ name: 'a' }], meta: { pagination } }).success);
    assert.ok(!schema.safeParse({ tags: [{ name: 'a' }] }).success);
    assert.ok(!schema.safeParse({ tags: [], meta: {} }).success);
  });

  it('accepts `limit=all`', function () {
    const meta = { pagination: { ...pagination, limit: 'all' } };
    assert.ok(schema.safeParse({ tags: [], meta }).success);
  });

  it('rejects unknown keys', function () {
    assert.ok(!schema.safeParse({ tags: [], meta: { pagination }, extra: 1 }).success);
  });
});

describe('resourceResponse', function () {
  const schema = resourceResponse('tags', item);

  it('requires exactly one item and no meta', function () {
    assert.ok(schema.safeParse({ tags: [{ name: 'a' }] }).success);
    assert.ok(!schema.safeParse({ tags: [] }).success);
    assert.ok(!schema.safeParse({ tags: [{ name: 'a' }, { name: 'b' }] }).success);
    assert.ok(!schema.safeParse({ tags: [{ name: 'a' }], meta: { pagination } }).success);
  });
});
