import assert from 'node:assert/strict';
import { z } from 'zod';
import { defineController, defineMethod } from '../src/index.ts';

describe('defineController', function () {
  it('returns the controller unchanged', function () {
    const read = defineMethod({
      schema: { options: z.object({ id: z.string() }) },
      permissions: false,
      query() {},
    });
    const config = { docName: 'widgets', read };

    const controller = defineController(config);

    assert.equal(controller, config);
    assert.equal(controller.read, read);
  });
});
