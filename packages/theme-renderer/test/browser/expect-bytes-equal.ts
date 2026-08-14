/**
 * Byte-equality assertion with first-divergence context in the failure message
 * (huge-string-diff-friendly). Runtime-neutral (no node:assert, no vitest
 * expect) so both the Node integration suites and the browser worker suite
 * share the one implementation — it lives under test/browser/ because the
 * browser tsconfig project only includes src/ and test/browser/ (same
 * placement precedent as replay-fetch.ts).
 */
import errors from '@tryghost/errors';
export interface ByteDiffLabels {
    /** What the actual side is, e.g. 'rendered' or 'worker' */
    actual: string;
    /** What the expected side is, e.g. 'live-normalized' or 'node-recorded' */
    expected: string;
}

export function expectBytesEqual(actual: string, expected: string, route: string, labels: ByteDiffLabels): void {
    if (actual === expected) {
        return;
    }
    let i = 0;
    while (i < actual.length && i < expected.length && actual[i] === expected[i]) {
        i += 1;
    }
    const start = Math.max(0, i - 150);
    throw new errors.ValidationError({message: [
        `byte divergence on ${route} at offset ${i} (${labels.actual} ${actual.length}B vs ${labels.expected} ${expected.length}B)`,
        `${labels.actual}: ${JSON.stringify(actual.slice(start, i + 200))}`,
        `${labels.expected}: ${JSON.stringify(expected.slice(start, i + 200))}`
    ].join('\n')});
}
