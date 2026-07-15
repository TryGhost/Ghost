import {computeCompExpiryAt, isCompExpiryDuration} from './member-comp-tier';
import {describe, expect, it, vi} from 'vitest';

describe('computeCompExpiryAt', () => {
    // Freeze "now" to a mid-day UTC timestamp so the duration math is deterministic
    // regardless of the machine's timezone (durations use `moment.utc().startOf('day')`).
    const NOW = new Date('2026-07-15T12:00:00.000Z');

    it('returns null for a forever comp', () => {
        vi.setSystemTime(NOW);
        expect(computeCompExpiryAt('forever')).toBeNull();
        vi.useRealTimers();
    });

    it('returns 7 days from now (UTC start-of-day) for a week duration', () => {
        vi.setSystemTime(NOW);
        expect(computeCompExpiryAt('week')).toBe('2026-07-22T00:00:00.000Z');
        vi.useRealTimers();
    });

    it('returns +1 month from now (UTC start-of-day) for a month duration', () => {
        vi.setSystemTime(NOW);
        expect(computeCompExpiryAt('month')).toBe('2026-08-15T00:00:00.000Z');
        vi.useRealTimers();
    });

    it('returns +6 months from now (UTC start-of-day) for a half-year duration', () => {
        vi.setSystemTime(NOW);
        expect(computeCompExpiryAt('half-year')).toBe('2027-01-15T00:00:00.000Z');
        vi.useRealTimers();
    });

    it('returns +1 year from now (UTC start-of-day) for a year duration', () => {
        vi.setSystemTime(NOW);
        expect(computeCompExpiryAt('year')).toBe('2027-07-15T00:00:00.000Z');
        vi.useRealTimers();
    });

    it('returns null for custom duration when no date is supplied (guard against a bad UI state)', () => {
        expect(computeCompExpiryAt('custom')).toBeNull();
    });

    it('lands the custom expiry on the picked calendar day (regression: local-day parse)', () => {
        // Custom date is a native <input type="date"> value (`YYYY-MM-DD`, LOCAL
        // calendar day). Ember's flow lands the resulting ISO on the picked day.
        // Naive `new Date('2027-03-10')` would interpret as UTC midnight, and for
        // admins west of UTC would then snap back to 2027-03-09 — this test pins
        // that the picked day never drops.
        const iso = computeCompExpiryAt('custom', '2027-03-10');
        expect(iso).not.toBeNull();
        // Extract the ISO date part — it MUST be the picked day (never 03-09).
        const isoDate = iso!.slice(0, 10);
        expect(isoDate === '2027-03-10' || isoDate === '2027-03-11').toBe(true);
        expect(isoDate).not.toBe('2027-03-09');
    });
});

describe('isCompExpiryDuration', () => {
    it('accepts every supported duration key', () => {
        expect(isCompExpiryDuration('forever')).toBe(true);
        expect(isCompExpiryDuration('week')).toBe(true);
        expect(isCompExpiryDuration('month')).toBe(true);
        expect(isCompExpiryDuration('half-year')).toBe(true);
        expect(isCompExpiryDuration('year')).toBe(true);
        expect(isCompExpiryDuration('custom')).toBe(true);
    });

    it('rejects unknown durations', () => {
        expect(isCompExpiryDuration('quarter')).toBe(false);
        expect(isCompExpiryDuration('')).toBe(false);
    });
});
