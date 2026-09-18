const assert = require('node:assert/strict');

const { roughSize } = require('../../../../../core/server/adapters/cache/rough-size');

describe('roughSize', function () {
  it('grows with the payload', function () {
    assert.ok(roughSize({ a: 'x'.repeat(1000) }) > roughSize({ a: 'x'.repeat(10) }));
    assert.ok(roughSize([1, 2, 3, 4, 5]) > roughSize([1]));
  });

  it('counts nested structures', function () {
    const flat = { a: 'x'.repeat(100) };
    const nested = { a: { b: { c: 'x'.repeat(100) } } };

    assert.ok(roughSize(nested) > roughSize(flat));
  });

  it('never returns zero, so lru-cache always accepts the size', function () {
    assert.ok(roughSize({}) >= 1);
    assert.ok(roughSize(null) >= 1);
    assert.ok(roughSize(undefined) >= 1);
    assert.ok(roughSize('') >= 1);
    assert.ok(roughSize(0) >= 1);
  });

  it('terminates on a cycle', function () {
    const cyclic = { name: 'loop' };
    cyclic.self = cyclic;

    assert.ok(roughSize(cyclic) >= 1);
  });

  it('lands in the right order of magnitude for a response-shaped object', function () {
    const response = {
      posts: Array.from({ length: 10 }, () => ({ html: 'x'.repeat(10000) })),
    };
    const size = roughSize(response);

    // ~100k characters at two bytes each, plus overheads.
    assert.ok(size > 150000, `expected > 150000, got ${size}`);
    assert.ok(size < 400000, `expected < 400000, got ${size}`);
  });
});
