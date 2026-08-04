import {describe, expect, it} from 'vitest';
import {formatPostTime} from './post-time';

// Ported from apps/ember-admin/app/helpers/gh-format-post-time.js. The rules
// are order-dependent (the <=12h relative window wins over everything, and
// "yesterday" is checked before "tomorrow"), so each branch is pinned.

const TZ = 'UTC';
const NOW = new Date('2026-08-04T12:00:00.000Z');

describe('formatPostTime', () => {
    describe('within 12 hours either way', () => {
        // Relative wins over every absolute format, in both directions.
        it('reads as relative for a recent past time', () => {
            expect(formatPostTime('2026-08-04T10:00:00.000Z', {timezone: TZ, now: NOW}))
                .toBe('2 hours ago');
        });

        it('reads as relative for a near-future time', () => {
            expect(formatPostTime('2026-08-04T14:00:00.000Z', {timezone: TZ, now: NOW}))
                .toBe('in 2 hours');
        });
    });

    describe('same day, more than 12 hours away', () => {
        // Reaching this branch needs the reference early in the day: from
        // midday, nothing later the same day is more than 12 hours off, so the
        // relative window above would win.
        const EARLY = new Date('2026-08-04T01:00:00.000Z');

        it('shows the time and "Today"', () => {
            expect(formatPostTime('2026-08-04T23:30:00.000Z', {timezone: TZ, now: EARLY}))
                .toBe('23:30 (UTC) Today');
        });

        it('prefixes "at" when scheduled', () => {
            expect(formatPostTime('2026-08-04T23:30:00.000Z', {timezone: TZ, now: EARLY, scheduled: true}))
                .toBe('at 23:30 (UTC) Today');
        });
    });

    describe('yesterday', () => {
        it('shows the time and "yesterday"', () => {
            expect(formatPostTime('2026-08-03T09:00:00.000Z', {timezone: TZ, now: NOW, absolute: true}))
                .toBe('09:00 (UTC) yesterday');
        });

        it('drops the time in short form', () => {
            expect(formatPostTime('2026-08-03T09:00:00.000Z', {timezone: TZ, now: NOW, absolute: true, short: true}))
                .toBe('Yesterday');
        });
    });

    it('shows the time and "tomorrow" when scheduled for tomorrow', () => {
        expect(formatPostTime('2026-08-05T09:00:00.000Z', {timezone: TZ, now: NOW, scheduled: true}))
            .toBe('at 09:00 (UTC) tomorrow');
    });

    describe('further away', () => {
        it('shows just the date in short form', () => {
            expect(formatPostTime('2026-07-01T09:00:00.000Z', {timezone: TZ, now: NOW, absolute: true, short: true}))
                .toBe('01 Jul 2026');
        });

        it('shows time and date in long form', () => {
            expect(formatPostTime('2026-07-01T09:00:00.000Z', {timezone: TZ, now: NOW, absolute: true}))
                .toBe('09:00 (UTC) 01 Jul 2026');
        });

        it('reads as a sentence when scheduled', () => {
            expect(formatPostTime('2026-09-01T09:00:00.000Z', {timezone: TZ, now: NOW, scheduled: true}))
                .toBe('at 09:00 (UTC) on 01 Sep 2026');
        });
    });

    describe('timezone offsets', () => {
        it('writes a bare (UTC) with no offset', () => {
            expect(formatPostTime('2026-07-01T09:00:00.000Z', {timezone: 'UTC', now: NOW, absolute: true}))
                .toContain('(UTC)');
        });

        // The helper trims a leading zero and the :00 minutes: +02:00 -> +2.
        it('trims a whole-hour offset', () => {
            expect(formatPostTime('2026-07-01T09:00:00.000Z', {timezone: 'Europe/Berlin', now: NOW, absolute: true}))
                .toContain('(UTC+2)');
        });

        it('keeps the minutes on a half-hour offset', () => {
            expect(formatPostTime('2026-07-01T09:00:00.000Z', {timezone: 'Asia/Kolkata', now: NOW, absolute: true}))
                .toContain('(UTC+5:30)');
        });

        it('renders the time in the given zone, not UTC', () => {
            expect(formatPostTime('2026-07-01T09:00:00.000Z', {timezone: 'Europe/Berlin', now: NOW, absolute: true}))
                .toBe('11:00 (UTC+2) 01 Jul 2026');
        });
    });

    it('returns empty for a missing time rather than "Invalid date"', () => {
        expect(formatPostTime(null, {timezone: TZ, now: NOW})).toBe('');
        expect(formatPostTime(undefined, {timezone: TZ, now: NOW})).toBe('');
    });
});
