import assert from 'node:assert/strict';
import { deepFreeze } from '../../../core/shared/deep-freeze';

describe('deepFreeze', function () {
  it('freezes nested objects and arrays', function () {
    const frozen = deepFreeze({ a: { b: [{ c: 1 }] } });

    assert.ok(Object.isFrozen(frozen.a));
    assert.ok(Object.isFrozen(frozen.a.b));
    assert.ok(Object.isFrozen(frozen.a.b[0]));
  });

  it('types the result read-only, since sloppy-mode writes fail silently', function () {
    const frozen = deepFreeze({ a: { b: [{ c: 1 }] } });

    // @ts-expect-error read-only
    assert.throws(() => (frozen.a = { b: [] }));
    // @ts-expect-error read-only
    assert.throws(() => frozen.a.b.push({ c: 2 }));
  });

  it('tolerates cycles', function () {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    assert.ok(Object.isFrozen(deepFreeze(cyclic)));
  });
});
