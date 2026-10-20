import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { parseQueryBooleans } from '../../../../../../core/server/web/api/middleware/parse-query-booleans';

function parse(query: unknown): unknown {
  const req = { query } as Request;
  let called = false;
  parseQueryBooleans(
    req,
    {} as Response,
    (() => {
      called = true;
    }) as NextFunction,
  );
  assert.equal(called, true);
  return req.query;
}

describe('parseQueryBooleans', function () {
  it('converts true and false strings to booleans', function () {
    assert.deepEqual(parse({ a: 'true', b: 'false', c: 'TRUE', d: 'yes', e: '' }), {
      a: true,
      b: false,
      c: 'TRUE',
      d: 'yes',
      e: '',
    });
  });

  it('ignores query keys named constructor', function () {
    assert.deepEqual(
      parse({ constructor: 'x', send_email: 'false', nested: { constructor: 'y', flag: 'true' } }),
      {
        constructor: 'x',
        send_email: false,
        nested: { constructor: 'y', flag: true },
      },
    );
  });

  it('converts values inside arrays and nested objects', function () {
    assert.deepEqual(parse({ list: ['true', 'x'], nested: { deep: { flag: 'false' } } }), {
      list: [true, 'x'],
      nested: { deep: { flag: false } },
    });
  });
});
