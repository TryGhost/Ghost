import {NOTE_MAX_LENGTH, getMemberEditableSlice, getNoteCharactersLeft, isDraftInSyncWithServer, isValidMemberEmail} from './member-detail-edit';
import {describe, expect, it} from 'vitest';

describe('getMemberEditableSlice', () => {
    it('normalizes missing fields to empty strings', () => {
        expect(getMemberEditableSlice({})).toEqual({name: '', email: '', note: ''});
        expect(getMemberEditableSlice({name: null, email: null, note: null})).toEqual({name: '', email: '', note: ''});
    });

    it('trims name and email (matching Ember blur-trim) but preserves note whitespace', () => {
        expect(getMemberEditableSlice({name: '  Ada  ', email: ' ada@x.co ', note: '  hi  '}))
            .toEqual({name: 'Ada', email: 'ada@x.co', note: '  hi  '});
    });

    it('passes through already-clean fields', () => {
        expect(getMemberEditableSlice({name: 'Ada', email: 'ada@x.co', note: 'VIP'}))
            .toEqual({name: 'Ada', email: 'ada@x.co', note: 'VIP'});
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
    const server = {name: 'Ada', email: 'ada@x.co', note: 'VIP'};

    it('is in sync when there is no draft yet', () => {
        expect(isDraftInSyncWithServer(undefined, server)).toBe(true);
    });

    it('is in sync when the draft equals the server baseline', () => {
        expect(isDraftInSyncWithServer({name: 'Ada', email: 'ada@x.co', note: 'VIP'}, server)).toBe(true);
    });

    it('ignores whitespace-only differences (normalized comparison)', () => {
        expect(isDraftInSyncWithServer({name: 'Ada ', email: ' ada@x.co', note: 'VIP'}, server)).toBe(true);
    });

    it('is out of sync when the user has edited a field', () => {
        expect(isDraftInSyncWithServer({name: 'Ada B', email: 'ada@x.co', note: 'VIP'}, server)).toBe(false);
    });
});
