import assert from 'node:assert/strict';
import { z } from 'zod';
import { defineMethod, type ValidatedFrame } from '../src/index.ts';

describe('defineMethod', function () {
  it('preserves schema instances and callback identities without parsing', function () {
    const schema = { options: z.object({ id: z.string() }) };
    let calls = 0;
    const query = (frame: ValidatedFrame<typeof schema>) => {
      calls += 1;
      return frame.validated.options.id;
    };
    const config = { schema, permissions: false, query };
    const method = defineMethod(config);

    assert.equal(method, config);
    assert.equal(method.schema.options, schema.options);
    assert.equal(method.query, query);
    assert.equal(calls, 0);
  });
});
