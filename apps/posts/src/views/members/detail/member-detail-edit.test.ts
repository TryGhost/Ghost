import {NOTE_MAX_LENGTH, buildMemberFieldEditPayload, getDefaultNewsletterIdsForNewMember, getEmailErrorMessage, getMemberEditableSlice, getMemberNewslettersUiEnabled, getMemberSuppressionInfo, getNoteCharactersLeft, isDraftInSyncWithServer, isValidMemberEmail, resolveSlugsToLabels, toggleMemberNewsletter} from './member-detail-edit';
import {describe, expect, it} from 'vitest';

describe('getMemberEditableSlice', () => {
    it('normalizes missing fields to empty strings and empty relation lists', () => {
        expect(getMemberEditableSlice({})).toEqual({name: '', email: '', note: '', labels: [], newsletters: []});
        expect(getMemberEditableSlice({name: null, email: null, note: null, labels: null, newsletters: null})).toEqual({name: '', email: '', note: '', labels: [], newsletters: []});
    });

    it('trims name and email (matching Ember blur-trim) but preserves note whitespace', () => {
        expect(getMemberEditableSlice({name: '  Ada  ', email: ' ada@x.co ', note: '  hi  '}))
            .toEqual({name: 'Ada', email: 'ada@x.co', note: '  hi  ', labels: [], newsletters: []});
    });

    it('passes through already-clean fields', () => {
        expect(getMemberEditableSlice({name: 'Ada', email: 'ada@x.co', note: 'VIP'}))
            .toEqual({name: 'Ada', email: 'ada@x.co', note: 'VIP', labels: [], newsletters: []});
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

    it('normalizes newsletter subscriptions to an id list sorted by id', () => {
        const slice = getMemberEditableSlice({
            newsletters: [
                {id: 'nl_c'},
                {id: 'nl_a'},
                {id: 'nl_b'}
            ]
        });
        expect(slice.newsletters).toEqual(['nl_a', 'nl_b', 'nl_c']);
    });
});

describe('buildMemberFieldEditPayload', () => {
    const baseline = {
        name: 'Ada',
        email: 'ada@x.co',
        note: '',
        labels: [],
        newsletters: ['nl_a', 'nl_b']
    };

    it('omits newsletters when the user has not changed them', () => {
        // Sending `[]` would unsubscribe the member from every newsletter, so an
        // unchanged newsletter set must NOT appear on the payload at all.
        const payload = buildMemberFieldEditPayload('mem_1', {...baseline, name: 'Ada B'}, baseline);
        expect(payload.newsletters).toBeUndefined();
        expect(payload.name).toBe('Ada B');
    });

    it('sends newsletters as {id}[] when the user has toggled them', () => {
        const payload = buildMemberFieldEditPayload('mem_1', {...baseline, newsletters: ['nl_a']}, baseline);
        expect(payload.newsletters).toEqual([{id: 'nl_a'}]);
    });

    it('sends an empty newsletters array only when the user has explicitly unsubscribed from all', () => {
        const payload = buildMemberFieldEditPayload('mem_1', {...baseline, newsletters: []}, baseline);
        expect(payload.newsletters).toEqual([]);
    });
});

describe('getMemberSuppressionInfo', () => {
    it('returns null when the member is not suppressed', () => {
        expect(getMemberSuppressionInfo(undefined)).toBeNull();
        expect(getMemberSuppressionInfo({suppressed: false})).toBeNull();
    });

    it('shows the banner without a label when suppressed but the info block is missing', () => {
        // Ember still renders "Email disabled" + the Re-enable button in this case
        // (e.g. email_disabled=true after the Mailgun row was cleaned), so we do too.
        expect(getMemberSuppressionInfo({suppressed: true})).toEqual({label: null});
    });

    it('reports the "Bounced" reason with a formatted date for a fail suppression', () => {
        // Use a mid-day UTC timestamp so the local-vs-UTC render doesn't cross a day boundary.
        expect(getMemberSuppressionInfo({
            suppressed: true,
            info: {reason: 'fail', timestamp: '2026-01-15T12:00:00.000Z'}
        })).toEqual({reason: 'fail', label: 'Bounced on 15 Jan 2026'});
    });

    it('reports the "Flagged as spam" reason with a formatted date for a spam suppression', () => {
        expect(getMemberSuppressionInfo({
            suppressed: true,
            info: {reason: 'spam', timestamp: '2026-02-01T12:00:00.000Z'}
        })).toEqual({reason: 'spam', label: 'Flagged as spam on 1 Feb 2026'});
    });

    it('falls back to a generic label for an unexpected reason', () => {
        expect(getMemberSuppressionInfo({
            suppressed: true,
            info: {reason: 'other', timestamp: '2026-03-01T12:00:00.000Z'}
        })).toEqual({reason: 'other', label: 'Email disabled on 1 Mar 2026'});
    });
});

describe('getMemberNewslettersUiEnabled', () => {
    it('hides the section only when explicitly disabled', () => {
        expect(getMemberNewslettersUiEnabled('disabled')).toBe(false);
    });

    it('shows the section for every other setting value', () => {
        expect(getMemberNewslettersUiEnabled('all')).toBe(true);
        expect(getMemberNewslettersUiEnabled('paid')).toBe(true);
        expect(getMemberNewslettersUiEnabled('filter')).toBe(true);
    });

    it('shows the section while the setting is still loading (prevents a flash-out)', () => {
        expect(getMemberNewslettersUiEnabled(undefined)).toBe(true);
        expect(getMemberNewslettersUiEnabled(null)).toBe(true);
    });
});

describe('toggleMemberNewsletter', () => {
    it('subscribes a member to a newsletter they are not yet subscribed to', () => {
        expect(toggleMemberNewsletter(['nl_a'], 'nl_b')).toEqual(['nl_a', 'nl_b']);
    });

    it('unsubscribes a member from a newsletter they are subscribed to', () => {
        expect(toggleMemberNewsletter(['nl_a', 'nl_b'], 'nl_a')).toEqual(['nl_b']);
    });

    it('is stable for a repeated toggle', () => {
        const once = toggleMemberNewsletter([], 'nl_a');
        const twice = toggleMemberNewsletter(once, 'nl_a');
        expect(twice).toEqual([]);
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

describe('getDefaultNewsletterIdsForNewMember', () => {
    // Ported from Ember's rule (`gh-member-settings-form.js:236-237`):
    // `subscribe_on_signup: true` AND `visibility: 'members'`. A drift on
    // either condition would silently either over-subscribe (privacy risk if
    // a paid newsletter leaks to a free member) or under-subscribe (marketing
    // regression if a signup-default newsletter is skipped).
    it('includes only subscribe_on_signup + visibility:members newsletters', () => {
        const newsletters = [
            {id: 'a', subscribe_on_signup: true, visibility: 'members'},   // ✓
            {id: 'b', subscribe_on_signup: true, visibility: 'paid'},      // ✗ paid-only
            {id: 'c', subscribe_on_signup: false, visibility: 'members'},  // ✗ opt-in only
            {id: 'd', subscribe_on_signup: true, visibility: null},         // ✗ visibility not 'members'
            {id: 'e', subscribe_on_signup: true, visibility: 'members'}    // ✓
        ];
        expect(getDefaultNewsletterIdsForNewMember(newsletters)).toEqual(['a', 'e']);
    });

    it('returns [] for undefined / null / empty inputs (loading states)', () => {
        expect(getDefaultNewsletterIdsForNewMember(undefined)).toEqual([]);
        expect(getDefaultNewsletterIdsForNewMember(null)).toEqual([]);
        expect(getDefaultNewsletterIdsForNewMember([])).toEqual([]);
    });

    it('preserves input order (no re-sort)', () => {
        // Downstream consumers may rely on original ordering (e.g. a
        // "primary newsletter first" rule); avoid injecting an implicit sort
        // that would silently reorder the resulting UI toggles.
        const newsletters = [
            {id: 'z', subscribe_on_signup: true, visibility: 'members'},
            {id: 'a', subscribe_on_signup: true, visibility: 'members'}
        ];
        expect(getDefaultNewsletterIdsForNewMember(newsletters)).toEqual(['z', 'a']);
    });
});

describe('getEmailErrorMessage', () => {
    it('returns null when the field has not been touched, regardless of value', () => {
        // Core New-member bug: the initial render of the create screen would
        // paint "Email is required." before the user typed anything. Gating
        // on `touched` keeps the field neutral until the user interacts.
        expect(getEmailErrorMessage('', false)).toBeNull();
        expect(getEmailErrorMessage('not-an-email', false)).toBeNull();
        expect(getEmailErrorMessage('ada@example.com', false)).toBeNull();
    });

    it('reports "Email is required." when touched and empty (or whitespace only)', () => {
        expect(getEmailErrorMessage('', true)).toBe('Email is required.');
        expect(getEmailErrorMessage('   ', true)).toBe('Email is required.');
    });

    it('reports "Invalid email." when touched and non-empty but malformed', () => {
        expect(getEmailErrorMessage('not-an-email', true)).toBe('Invalid email.');
        expect(getEmailErrorMessage('a@b', true)).toBe('Invalid email.');
    });

    it('returns null when touched and the value is a valid email', () => {
        expect(getEmailErrorMessage('ada@example.com', true)).toBeNull();
        expect(getEmailErrorMessage('  ada@example.com  ', true)).toBeNull();
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
    const server = {
        name: 'Ada',
        email: 'ada@x.co',
        note: 'VIP',
        labels: [{name: 'Beta', slug: 'beta'}],
        newsletters: ['nl_a']
    };

    it('is in sync when there is no draft yet', () => {
        expect(isDraftInSyncWithServer(undefined, server)).toBe(true);
    });

    it('is in sync when the draft equals the server baseline', () => {
        expect(isDraftInSyncWithServer({...server}, server)).toBe(true);
    });

    it('ignores whitespace-only differences (normalized comparison)', () => {
        expect(isDraftInSyncWithServer({...server, name: 'Ada ', email: ' ada@x.co'}, server)).toBe(true);
    });

    it('is out of sync when the user has edited a field', () => {
        expect(isDraftInSyncWithServer({...server, name: 'Ada B'}, server)).toBe(false);
    });

    it('is out of sync when the user has changed labels', () => {
        expect(isDraftInSyncWithServer({...server, labels: []}, server)).toBe(false);
    });

    it('is out of sync when the user has toggled a newsletter', () => {
        expect(isDraftInSyncWithServer({...server, newsletters: []}, server)).toBe(false);
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
