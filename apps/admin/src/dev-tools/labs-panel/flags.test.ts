import {BETA_FLAGS, PRIVATE_FLAGS, WRITABLE_FLAGS, readFlagArray} from './flags';
import {describe, expect, it} from 'vitest';

/**
 * The panel derives its flag list by parsing ghost/core/core/shared/labs.js as
 * text, so a reformat of that file is the one change that can quietly break it.
 * These cases are the plausible reformats — the point is that each either parses
 * correctly or throws, and none of them silently returns a shorter list.
 */
const LABS_SOURCE = `
const GA_FEATURES = [
    'customFonts',
    'explore'
];

const PUBLIC_BETA_FEATURES = [
    'superEditors',
    'editorExcerpt'
];

const PRIVATE_FEATURES = [
    'automations',
    'tagsX'
];

module.exports.WRITABLE_KEYS_ALLOWLIST = [...PUBLIC_BETA_FEATURES, ...PRIVATE_FEATURES];
`;

describe('readFlagArray', () => {
    it('reads an array in the shape labs.js uses today', () => {
        expect(readFlagArray(LABS_SOURCE, 'PUBLIC_BETA_FEATURES')).toEqual(['superEditors', 'editorExcerpt']);
        expect(readFlagArray(LABS_SOURCE, 'PRIVATE_FEATURES')).toEqual(['automations', 'tagsX']);
    });

    it('reads double-quoted entries, so a formatter run cannot drop flags', () => {
        const reformatted = LABS_SOURCE.replace('\'superEditors\'', '"superEditors"');

        expect(readFlagArray(reformatted, 'PUBLIC_BETA_FEATURES')).toEqual(['superEditors', 'editorExcerpt']);
    });

    it('is not truncated by a bracket inside a comment', () => {
        // The nastiest breakage: a short parse looks healthy, so the empty-list
        // guard never fires, and the dropped flags leave the write payload.
        const commented = LABS_SOURCE.replace('\'automations\',', '\'automations\', // [see BER-1234]');

        expect(readFlagArray(commented, 'PRIVATE_FEATURES')).toEqual(['automations', 'tagsX']);
    });

    it('is not truncated by a comment containing the array terminator', () => {
        const commented = LABS_SOURCE.replace('\'automations\',', '\'automations\', // ends with ];');

        expect(readFlagArray(commented, 'PRIVATE_FEATURES')).toEqual(['automations', 'tagsX']);
    });

    it('ignores a commented-out entry rather than reading it as live', () => {
        const commented = LABS_SOURCE.replace('    \'tagsX\'', '    // \'tagsX\'');

        expect(readFlagArray(commented, 'PRIVATE_FEATURES')).toEqual(['automations']);
    });

    it('does not latch onto the spread in WRITABLE_KEYS_ALLOWLIST', () => {
        // That line mentions both const names; matching it would yield no flags.
        expect(readFlagArray(LABS_SOURCE, 'PRIVATE_FEATURES')).not.toHaveLength(0);
    });

    it('throws when the array is renamed away', () => {
        expect(() => readFlagArray(LABS_SOURCE, 'RENAMED_FEATURES')).toThrow(/couldn't parse RENAMED_FEATURES/);
    });

    it('throws when a type annotation breaks the declaration shape', () => {
        const typed = LABS_SOURCE.replace('const PRIVATE_FEATURES =', 'const PRIVATE_FEATURES: string[] =');

        expect(() => readFlagArray(typed, 'PRIVATE_FEATURES')).toThrow(/couldn't parse/);
    });

    it('throws rather than returning an empty list', () => {
        expect(() => readFlagArray('const PRIVATE_FEATURES = [];', 'PRIVATE_FEATURES')).toThrow(/couldn't parse/);
    });
});

/**
 * Asserted as invariants rather than as an expected list of flag names: flags
 * graduate to GA and get deleted constantly, and a hardcoded list here would be
 * pure churn. These catch a mis-anchored regex latching onto the wrong array.
 */
describe('the flags parsed from the real labs.js', () => {
    it('finds both groups', () => {
        expect(BETA_FLAGS.length).toBeGreaterThan(0);
        expect(PRIVATE_FLAGS.length).toBeGreaterThan(0);
    });

    it('reads flag keys, not stray source text', () => {
        [...BETA_FLAGS, ...PRIVATE_FLAGS].forEach((flag) => {
            expect(flag).toMatch(/^[a-z][A-Za-z0-9]*$/);
        });
    });

    it('keeps the two groups disjoint', () => {
        expect(BETA_FLAGS.filter(flag => PRIVATE_FLAGS.includes(flag))).toEqual([]);
    });

    it('exposes their union as the writable set', () => {
        expect(WRITABLE_FLAGS.size).toBe(BETA_FLAGS.length + PRIVATE_FLAGS.length);
    });
});
