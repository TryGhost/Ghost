import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import { labels, snippets } from '../src/admin/index.ts';

// The API framework compiles these schemas, and silently falls back to Zod's
// runtime parser for any it can't model.

const contracts = { labels, snippets };
const METHODS = new Set(['browse', 'read', 'add', 'edit', 'destroy']);

describe('compilable contracts', function () {
  for (const [resource, methods] of Object.entries(contracts)) {
    for (const [method, schemas] of Object.entries(methods)) {
      if (!METHODS.has(method)) {
        continue;
      }
      for (const [channel, schema] of Object.entries(schemas as Record<string, z.ZodType>)) {
        it(`${resource}.${method}.${channel} can compile to the fast path`, function () {
          assert.doesNotThrow(() => z.compile(schema, { strict: true }));
        });
      }
    }
  }
});
