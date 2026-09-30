import assert from 'node:assert/strict';
import { describe, expectTypeOf, it } from 'vitest';
import { memoize, once } from '../src/index.ts';

describe('once', function () {
  it('computes exactly once and returns the same value', function () {
    let calls = 0;
    const value = { id: 1 };
    const get = once(() => {
      calls += 1;
      return value;
    });

    assert.equal(get(), value);
    assert.equal(get(), value);
    assert.equal(get(), value);
    assert.equal(calls, 1);
  });

  it('memoizes a falsy value without recomputing', function () {
    let calls = 0;
    const get = once(() => {
      calls += 1;
      return undefined;
    });

    assert.equal(get(), undefined);
    assert.equal(get(), undefined);
    assert.equal(calls, 1);
  });

  it('recomputes after reset', function () {
    let calls = 0;
    const get = once(() => {
      calls += 1;
      return calls;
    });

    assert.equal(get(), 1);
    get.reset();
    assert.equal(get(), 2);
    assert.equal(get(), 2);
    assert.equal(calls, 2);
  });

  it('does not memoize a throwing compute', function () {
    let calls = 0;
    const get = once(() => {
      calls += 1;
      if (calls < 3) {
        throw new Error(`boom ${calls}`);
      }
      return 'ok';
    });

    assert.throws(() => get(), /boom 1/);
    assert.throws(() => get(), /boom 2/);
    assert.equal(get(), 'ok');
    assert.equal(get(), 'ok');
    assert.equal(calls, 3);
  });

  it('stores a promise like any other value', async function () {
    let calls = 0;
    const get = once(() => {
      calls += 1;
      return Promise.reject(new Error('boom'));
    });

    const first = get();
    assert.equal(get(), first);
    await assert.rejects(first, /boom/);
    assert.equal(calls, 1);
  });
});

describe('memoize', function () {
  it('memoizes per key', function () {
    let calls = 0;
    const upper = memoize(
      (input: string) => {
        calls += 1;
        return input.toUpperCase();
      },
      (input) => input,
    );

    assert.equal(upper('a'), 'A');
    assert.equal(upper('a'), 'A');
    assert.equal(upper('b'), 'B');
    assert.equal(upper('b'), 'B');
    assert.equal(calls, 2);
    assert.equal(upper.size, 2);
  });

  it('keys on the derived key, not the raw arguments', function () {
    let calls = 0;
    const format = memoize(
      (locale: string, options: { style: string }) => {
        calls += 1;
        return `${locale}/${options.style}`;
      },
      (locale, options) => `${locale}:${options.style}`,
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
    assert.equal(compute.size, 2);

    // Touch 'a' so 'b' becomes the least recently used entry.
    compute('a');
    compute('c');

    assert.equal(compute.size, 2);
    assert.deepEqual(seen, ['a', 'b', 'c']);

    // 'a' and 'c' are still held; 'b' was evicted and recomputes.
    compute('a');
    compute('c');
    assert.deepEqual(seen, ['a', 'b', 'c']);

    compute('b');
    assert.deepEqual(seen, ['a', 'b', 'c', 'b']);
  });

  it('defaults to a modest bound', function () {
    const compute = memoize(
      (n: number) => n,
      (n) => String(n),
    );

    for (let n = 0; n < 600; n += 1) {
      compute(n);
    }

    assert.equal(compute.size, 500);
  });

  it('rejects a non-finite or non-positive max', function () {
    const compute = (n: number) => n;
    const key = (n: number) => String(n);

    assert.throws(() => memoize(compute, key, { max: Infinity }), /positive integer, got Infinity/);
    assert.throws(() => memoize(compute, key, { max: Number.NaN }), /positive integer, got NaN/);
    assert.throws(() => memoize(compute, key, { max: 0 }), /positive integer, got 0/);
    assert.throws(() => memoize(compute, key, { max: -1 }), /positive integer, got -1/);
    assert.throws(() => memoize(compute, key, { max: 1.5 }), /positive integer, got 1.5/);
  });

  it('clears on reset', function () {
    let calls = 0;
    const compute = memoize(
      (input: string) => {
        calls += 1;
        return input;
      },
      (input) => input,
    );

    compute('a');
    compute('a');
    assert.equal(calls, 1);

    compute.reset();
    assert.equal(compute.size, 0);

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
    );

    assert.throws(() => compute('a'), /boom/);
    assert.equal(compute.size, 0);
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
    );

    assert.equal(compute('miss'), undefined);
    assert.equal(compute('miss'), undefined);
    assert.equal(calls, 2);
    assert.equal(compute.size, 0);
  });

  it('preserves the compute signature', function () {
    const compute = memoize(
      (locale: string, count: number) => ({ locale, count }),
      (locale, count) => `${locale}:${count}`,
    );

    expectTypeOf(compute).parameters.toEqualTypeOf<[string, number]>();
    expectTypeOf(compute).returns.toEqualTypeOf<{ locale: string; count: number }>();
    expectTypeOf(compute.reset).toEqualTypeOf<() => void>();
    expectTypeOf(compute.size).toEqualTypeOf<number>();
    expectTypeOf(once(() => 'value')).returns.toEqualTypeOf<string>();

    assert.deepEqual(compute('en', 1), { locale: 'en', count: 1 });
  });
});
