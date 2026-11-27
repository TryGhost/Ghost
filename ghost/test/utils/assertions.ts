import assert from 'node:assert/strict';
import { inspect, isDeepStrictEqual } from 'node:util';
import { isPlainObject } from 'lodash';
import * as expressTest from '@tryghost/express-test';

const { snapshotManager } = expressTest.snapshot;

export function assertExists<T>(
  value: T,
  message = 'Value should exist',
): asserts value is NonNullable<T> {
  assert(value !== undefined && value !== null, message);
}

/**
 * Checks that `time` is a time as the API returns one stored to the second, in ISO 8601 in UTC,
 * and that it is from `from` to now. A time stored to the second can be up to a second earlier
 * than `from`, so `from` is compared without its milliseconds.
 */
export function assertTimeSince(time: string | null | undefined, from: Date): void {
  assertExists(time, 'Expected a time');
  assert.equal(new Date(time).toISOString(), time, `${time} is not an ISO 8601 time in UTC`);
  assert.match(time, /\.000Z$/, `${time} is not to the second`);
  const earliest = Math.floor(from.getTime() / 1000) * 1000;
  assert.ok(new Date(time).getTime() >= earliest, `${time} is before ${from.toISOString()}`);
  assert.ok(new Date(time).getTime() <= Date.now(), `${time} is in the future`);
}

export function assertMatchSnapshot(
  obj: Parameters<typeof snapshotManager.match>[0],
  properties?: Parameters<typeof snapshotManager.match>[1],
): void {
  const result = snapshotManager.match(obj, properties);
  assert(result.pass, result.message());
}

export function assertArrayContainsDeep<T>(
  arr: ReadonlyArray<T>,
  expectedElements: ReadonlyArray<T>,
  message?: string,
): void {
  for (const expectedElement of expectedElements) {
    assert(
      arr.some((el) => isDeepStrictEqual(el, expectedElement)),
      message || `Expected ${inspect(expectedElement)} to be found`,
    );
  }
}

function objectMatches<T>(obj: T, properties: Partial<T>): boolean {
  for (const [key, value] of Object.entries(properties)) {
    const objValue = (obj as Record<string, unknown>)[key];
    // Only match partially when both sides are plain objects. Recursing on the
    // actual value alone would accept any object where a primitive is expected.
    const matches =
      isPlainObject(objValue) && isPlainObject(value)
        ? objectMatches(objValue as object, value as object)
        : isDeepStrictEqual(objValue, value);
    if (!matches) {
      return false;
    }
  }
  return true;
}

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function assertArrayMatchesWithoutOrder<T extends object>(
  haystack: ReadonlyArray<T>,
  needles: ReadonlyArray<DeepPartial<T>>,
): void {
  assert.equal(
    haystack.length,
    needles.length,
    `Expected ${needles.length} items, but got ${haystack.length}`,
  );
  for (const a of needles) {
    assert(haystack.some((el) => objectMatches(el, a)));
  }
}

export function assertObjectMatches<T extends object>(
  obj: T,
  properties: DeepPartial<T>,
  message?: string,
): void {
  for (const [key, value] of Object.entries(properties)) {
    const objValue = (obj as Record<string, unknown>)[key];
    // See objectMatches: partial matching needs a plain object on both sides.
    if (isPlainObject(objValue) && isPlainObject(value)) {
      assertObjectMatches(objValue as object, value as DeepPartial<object>, message);
    } else {
      assert.deepEqual(objValue, value, message || `Property mismatch for key "${key}"`);
    }
  }
}
