import errors from '@tryghost/errors';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { defineMethod, type SchemaFrame } from '../src/index.ts';

describe('defineMethod', function () {
  it('preserves schema instances and callback identities without parsing', function () {
    const schema = { params: z.object({ id: z.string() }) };
    let calls = 0;
    const handler = (frame: SchemaFrame<typeof schema>) => {
      calls += 1;
      return frame.params.id;
    };
    const config = { schema, permissions: false, handler };
    const method = defineMethod(config);

    assert.equal(method, config);
    assert.equal(method.schema.params, schema.params);
    assert.equal(method.handler, handler);
    assert.equal(calls, 0);
  });

  it.each([
    ['no schema', { permissions: false, handler() {} }, /requires a schema/],
    ['no channel', { schema: {}, permissions: false, handler() {} }, /params, query or body/],
    [
      'an unknown channel',
      { schema: { options: z.object({}) } },
      /Unknown schema channel "options"/,
    ],
    ['a non-object query', { schema: { query: z.string() } }, /schema\.query must be a z\.object/],
    [
      'a key in params and query',
      { schema: { params: z.object({ id: z.string() }), query: z.object({ id: z.string() }) } },
      /"id" is declared in both/,
    ],
    [
      'a reserved option',
      { schema: { query: z.object({ context: z.unknown() }) } },
      /reserved option "context"/,
    ],
    ['a query callback', { schema: { body: z.string() }, query() {} }, /cannot declare "query"/],
    [
      'an options allowlist',
      { schema: { body: z.string() }, options: ['id'] },
      /cannot declare "options"/,
    ],
    ['a data allowlist', { schema: { body: z.string() }, data: ['id'] }, /cannot declare "data"/],
    ['no handler', { schema: { body: z.string() }, handler: undefined }, /require a handler/],
  ])('rejects a definition with %s', function (_name, definition, message) {
    assert.throws(
      () => defineMethod({ permissions: false, handler() {}, ...definition } as never),
      (error: unknown) => {
        assert.ok(error instanceof errors.IncorrectUsageError);
        assert.match(error.message, message);
        return true;
      },
    );
  });
});
