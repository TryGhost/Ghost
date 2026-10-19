import assert from 'node:assert/strict';
import { expectTypeOf } from 'vitest';
import { memoize } from '../../../core/shared/memoize';

describe('memoize', function () {
  it('memoizes per key', function () {
    let calls = 0;
    const upper = memoize(
      (input: string) => {
        calls += 1;
        return input.toUpperCase();
      },
      (input) => input,
      { max: 10 },
    );

    assert.equal(upper('a'), 'A');
    assert.equal(upper('a'), 'A');
    assert.equal(upper('b'), 'B');
    assert.equal(upper('b'), 'B');
    assert.equal(calls, 2);
  });

  it('keys on the derived key, not the raw arguments', function () {
    let calls = 0;
    const format = memoize(
      (locale: string, options: { style: string }) => {
        calls += 1;
        return `${locale}/${options.style}`;
      },
      (locale, options) => `${locale}:${options.style}`,
      { max: 10 },
    );

    assert.equal(format('en', { style: 'long' }), 'en/long');
    // A structurally different object with the same key is a hit.
    assert.equal(format('en', { style: 'long' }), 'en/long');
    assert.equal(calls, 1);

    assert.equal(format('en', { style: 'short' }), 'en/short');
    assert.equal(calls, 2);
  });

  it('bounds entries and evicts in LRU order', function () {
    const seen: string[] = [];
    const compute = memoize(
      (input: string) => {
        seen.push(input);
        return input;
      },
      (input) => input,
      { max: 2 },
    );

    compute('a');
    compute('b');

    // Touch 'a' so 'b' becomes the least recently used entry.
    compute('a');
    compute('c');

    assert.deepEqual(seen, ['a', 'b', 'c']);

    // 'a' and 'c' are still held; 'b' was evicted and recomputes.
    compute('a');
    compute('c');
    assert.deepEqual(seen, ['a', 'b', 'c']);

    compute('b');
    assert.deepEqual(seen, ['a', 'b', 'c', 'b']);
  });

  it('rejects a max that is not a positive safe integer', function () {
    const compute = (n: number) => n;
    const key = (n: number) => String(n);

    assert.throws(() => memoize(compute, key, { max: Infinity }), /positive integer, got Infinity/);
    assert.throws(() => memoize(compute, key, { max: Number.NaN }), /positive integer, got NaN/);
    assert.throws(() => memoize(compute, key, { max: 0 }), /positive integer, got 0/);
    assert.throws(() => memoize(compute, key, { max: -1 }), /positive integer, got -1/);
    assert.throws(() => memoize(compute, key, { max: 1.5 }), /positive integer, got 1.5/);
    assert.throws(
      () => memoize(compute, key, { max: 2 ** 53 }),
      /positive integer, got 9007199254740992/,
    );
  });

  it('clears on reset', function () {
    let calls = 0;
    const compute = memoize(
      (input: string) => {
        calls += 1;
        return input;
      },
      (input) => input,
      { max: 10 },
    );

    compute('a');
    compute('a');
    assert.equal(calls, 1);

    compute.reset();

    compute('a');
    assert.equal(calls, 2);
  });

  it('does not memoize a throwing compute', function () {
    let calls = 0;
    const compute = memoize(
      (input: string) => {
        calls += 1;
        if (calls < 2) {
          throw new Error('boom');
        }
        return input;
      },
      (input) => input,
      { max: 10 },
    );

    assert.throws(() => compute('a'), /boom/);
    assert.equal(compute('a'), 'a');
    assert.equal(compute('a'), 'a');
    assert.equal(calls, 2);
  });

  it('recomputes an undefined result rather than storing it', function () {
    let calls = 0;
    const compute = memoize(
      (input: string): string | undefined => {
        calls += 1;
        return input === 'miss' ? undefined : input;
      },
      (input) => input,
      { max: 10 },
    );

    assert.equal(compute('miss'), undefined);
    assert.equal(compute('miss'), undefined);
    assert.equal(calls, 2);
  });

  it('preserves the compute signature', function () {
    const compute = memoize(
      (locale: string, count: number) => ({ locale, count }),
      (locale, count) => `${locale}:${count}`,
      { max: 10 },
    );

    expectTypeOf(compute).parameters.toEqualTypeOf<[string, number]>();
    expectTypeOf(compute).returns.toEqualTypeOf<{ locale: string; count: number }>();
    expectTypeOf(compute.reset).toEqualTypeOf<() => void>();

    assert.deepEqual(compute('en', 1), { locale: 'en', count: 1 });
  });
});
