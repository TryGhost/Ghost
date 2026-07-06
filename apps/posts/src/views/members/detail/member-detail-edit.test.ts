import {NOTE_MAX_LENGTH, getMemberEditableSlice, getNoteCharactersLeft, isDraftInSyncWithServer, isValidMemberEmail, resolveSlugsToLabels} from './member-detail-edit';
import {describe, expect, it} from 'vitest';

describe('getMemberEditableSlice', () => {
    it('normalizes missing fields to empty strings and an empty label list', () => {
        expect(getMemberEditableSlice({})).toEqual({name: '', email: '', note: '', labels: []});
        expect(getMemberEditableSlice({name: null, email: null, note: null, labels: null})).toEqual({name: '', email: '', note: '', labels: []});
    });

    it('trims name and email (matching Ember blur-trim) but preserves note whitespace', () => {
        expect(getMemberEditableSlice({name: '  Ada  ', email: ' ada@x.co ', note: '  hi  '}))
            .toEqual({name: 'Ada', email: 'ada@x.co', note: '  hi  ', labels: []});
    });

    it('passes through already-clean fields', () => {
        expect(getMemberEditableSlice({name: 'Ada', email: 'ada@x.co', note: 'VIP'}))
            .toEqual({name: 'Ada', email: 'ada@x.co', note: 'VIP', labels: []});
    });

    it('normalizes labels to {name, slug} sorted by slug', () => {
        const slice = getMemberEditableSlice({
            name: 'Ada',
            labels: [
                {name: 'VIP', slug: 'vip'},
                {name: 'Beta', slug: 'beta'}
            ]
        });
        expect(slice.labels).toEqual([
            {name: 'Beta', slug: 'beta'},
            {name: 'VIP', slug: 'vip'}
        ]);
    });
});

describe('isValidMemberEmail', () => {
    it('accepts normal and plus-addressed emails', () => {
        expect(isValidMemberEmail('ada@example.com')).toBe(true);
        expect(isValidMemberEmail('ada+news@example.com')).toBe(true);
    });

    it('trims before validating', () => {
        expect(isValidMemberEmail('  ada@example.com  ')).toBe(true);
    });

    it('rejects empty or malformed emails', () => {
        expect(isValidMemberEmail('')).toBe(false);
        expect(isValidMemberEmail('   ')).toBe(false);
        expect(isValidMemberEmail('not-an-email')).toBe(false);
        expect(isValidMemberEmail('a@b')).toBe(false);
        expect(isValidMemberEmail('a@b.')).toBe(false);
        expect(isValidMemberEmail('a b@example.com')).toBe(false);
    });
});

describe('getNoteCharactersLeft', () => {
    it('counts down from the 500-char soft limit', () => {
        expect(getNoteCharactersLeft('')).toBe(NOTE_MAX_LENGTH);
        expect(getNoteCharactersLeft('hi')).toBe(NOTE_MAX_LENGTH - 2);
    });

    it('counts unicode code points, not UTF-16 code units (emoji count as one)', () => {
        // '👍' is two UTF-16 code units — String.length would over-count it.
        expect(getNoteCharactersLeft('👍👍👍')).toBe(NOTE_MAX_LENGTH - 3);
    });

    it('goes negative when the soft limit is exceeded (matching Ember)', () => {
        expect(getNoteCharactersLeft('x'.repeat(520))).toBe(-20);
    });
});

describe('isDraftInSyncWithServer', () => {
    const server = {name: 'Ada', email: 'ada@x.co', note: 'VIP', labels: [{name: 'Beta', slug: 'beta'}]};

    it('is in sync when there is no draft yet', () => {
        expect(isDraftInSyncWithServer(undefined, server)).toBe(true);
    });

    it('is in sync when the draft equals the server baseline', () => {
        expect(isDraftInSyncWithServer({name: 'Ada', email: 'ada@x.co', note: 'VIP', labels: [{name: 'Beta', slug: 'beta'}]}, server)).toBe(true);
    });

    it('ignores whitespace-only differences (normalized comparison)', () => {
        expect(isDraftInSyncWithServer({name: 'Ada ', email: ' ada@x.co', note: 'VIP', labels: [{name: 'Beta', slug: 'beta'}]}, server)).toBe(true);
    });

    it('is out of sync when the user has edited a field', () => {
        expect(isDraftInSyncWithServer({name: 'Ada B', email: 'ada@x.co', note: 'VIP', labels: [{name: 'Beta', slug: 'beta'}]}, server)).toBe(false);
    });

    it('is out of sync when the user has changed labels', () => {
        expect(isDraftInSyncWithServer({name: 'Ada', email: 'ada@x.co', note: 'VIP', labels: []}, server)).toBe(false);
    });
});

describe('resolveSlugsToLabels', () => {
    const known = new Map([
        ['vip', {name: 'VIP', slug: 'vip'}],
        ['beta', {name: 'Beta', slug: 'beta'}]
    ]);

    it('resolves known slugs to their full label objects, preserving order', () => {
        expect(resolveSlugsToLabels(['beta', 'vip'], known)).toEqual([
            {name: 'Beta', slug: 'beta'},
            {name: 'VIP', slug: 'vip'}
        ]);
    });

    it('falls back to using the slug as the name for an unknown slug', () => {
        expect(resolveSlugsToLabels(['mystery'], known)).toEqual([{name: 'mystery', slug: 'mystery'}]);
    });
});
