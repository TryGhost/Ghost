import assert from 'node:assert/strict';
import {inspect, isDeepStrictEqual} from 'node:util';
import {isPlainObject} from 'lodash';
// @ts-expect-error @tryghost/express-test lacks type definitions.
import * as expressTest from '@tryghost/express-test';

const {snapshotManager} = expressTest.snapshot;

export function assertExists<T>(value: T, message = 'Value should exist'): asserts value is NonNullable<T> {
    assert(
        (value !== undefined) && (value !== null),
        message
    );
}

export function assertMatchSnapshot(
    obj: Parameters<typeof snapshotManager.match>[0],
    properties?: Parameters<typeof snapshotManager.match>[1]
): void {
    const result = snapshotManager.match(obj, properties);
    assert(result.pass, result.message());
}

export function assertArrayContainsDeep<T>(
    arr: ReadonlyArray<T>,
    expectedElements: ReadonlyArray<T>,
    message?: string
): void {
    for (const expectedElement of expectedElements) {
        assert(
            arr.some(el => isDeepStrictEqual(el, expectedElement)),
            message || `Expected ${inspect(expectedElement)} to be found`
        );
    }
}

function objectMatches<T>(obj: T, properties: Partial<T>): boolean {
    for (const [key, value] of Object.entries(properties)) {
        const objValue = (obj as Record<string, unknown>)[key];
        const matches = isPlainObject(objValue)
            ? objectMatches(objValue as object, value as object)
            : isDeepStrictEqual(objValue, value);
        if (!matches) {
            return false;
        }
    }
    return true;
}

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export function assertArrayMatchesWithoutOrder<T extends object>(
    haystack: ReadonlyArray<T>,
    needles: ReadonlyArray<DeepPartial<T>>
): void {
    assert.equal(
        haystack.length,
        needles.length,
        `Expected ${needles.length} items, but got ${haystack.length}`
    );
    for (const a of needles) {
        assert(haystack.some(el => objectMatches(el, a)));
    }
}

export function assertObjectMatches<T extends object>(obj: T, properties: DeepPartial<T>, message?: string): void {
    for (const [key, value] of Object.entries(properties)) {
        const objValue = (obj as Record<string, unknown>)[key];
        if (isPlainObject(objValue)) {
            assertObjectMatches(objValue as object, value as DeepPartial<object>, message);
        } else {
            assert.deepEqual(
                objValue,
                value,
                message || `Property mismatch for key "${key}"`
            );
        }
    }
}
