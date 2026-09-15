import assert from 'node:assert/strict';

import type { Mock } from 'vitest';

import type { Count, GhostErrorOptions } from '../../src/types.ts';

/** A Ghost-shaped error, as the tests read one back off a caught value. */
export interface ThrownError extends Error {
  errorType: string;
  help?: string;
  errorDetails?: GhostErrorOptions['errorDetails'];
}

/** One that names the limit it was raised for, which every configured limit does. */
export interface ThrownNamedError extends ThrownError {
  errorDetails: { name: string };
}

/** One that also carries the counts, which only the counted limits raise. */
export interface ThrownCountedError extends ThrownNamedError {
  errorDetails: { name: string; limit: number; total: Count };
}

export function assertThrownError(value: unknown): asserts value is ThrownError {
  assert(value instanceof Error, 'expected an error to have been thrown');
  assert(
    'errorType' in value && typeof value.errorType === 'string',
    'expected a Ghost error, carrying an errorType',
  );
}

export function assertThrownNamedError(value: unknown): asserts value is ThrownNamedError {
  assertThrownError(value);
  assert(
    typeof value.errorDetails?.name === 'string',
    'expected the error to name the limit it was raised for',
  );
}

export function assertThrownCountedError(value: unknown): asserts value is ThrownCountedError {
  assertThrownNamedError(value);
  // Widening, not asserting: a named error's details are read here for two more fields.
  const details: { name: string; limit?: unknown; total?: unknown } = value.errorDetails;
  assert(
    typeof details.limit === 'number',
    'expected the error to carry the limit it was raised against',
  );
  // The count is carried exactly as the database returned it, so it may be text, or nothing
  // at all. Everything the drivers can hand back is allowed and nothing else, so a total
  // that is neither a count nor an absent one still fails here.
  const { total } = details;
  assert(
    'total' in details &&
      (typeof total === 'number' ||
        typeof total === 'string' ||
        total === null ||
        total === undefined),
    'expected the error to carry the count it was raised with',
  );
}

export function assertExists<T>(
  value: T,
  message = 'Value should exist',
): asserts value is NonNullable<T> {
  assert(value !== undefined && value !== null, message);
}

/** The limits a site ended up with include these, whatever else it also has. */
export function assertHasLimits(limits: object, names: string[]): void {
  for (const name of names) {
    assert.ok(name in limits, `expected a ${name} limit`);
  }
}

/** Every call the mock received was made with exactly these arguments. */
export function assertAlwaysCalledWith(fn: Mock, ...args: unknown[]): void {
  assert.ok(fn.mock.calls.length > 0, 'expected the mock to have been called');

  for (const [index, call] of fn.mock.calls.entries()) {
    assert.deepEqual(call, args, `call ${index} was made with different arguments`);
  }
}

/**
 * Every call began with these arguments, whatever else followed. The periodic limits pass
 * the period alongside the connection, which this deliberately does not constrain.
 */
export function assertAlwaysCalledWithLeading(fn: Mock, ...args: unknown[]): void {
  assert.ok(fn.mock.calls.length > 0, 'expected the mock to have been called');

  for (const [index, call] of fn.mock.calls.entries()) {
    assert.deepEqual(call.slice(0, args.length), args, `call ${index} began differently`);
  }
}
